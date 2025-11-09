// Load environment variables FIRST before any imports
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Now import everything else
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  createOrUpdateUser,
  getUserByEmail,
  getUserByWallet,
  createDonation,
  getDonations,
  getDonationsByEmail,
  calculateFIFONotifications,
  processReimbursement,
  createReimbursement,
} from './api/lib/storage.js';
import { getResendClient, DEFAULT_FROM_EMAIL } from './api/lib/resend-client.js';
import { generateNotificationEmail } from './api/lib/email-template.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// JWT generation function (updated to match Coinbase examples)
function generateCDPJWT() {
  const apiKeyName = process.env.CDP_API_KEY_NAME;
  let apiKeyPrivateKey = process.env.CDP_API_KEY_PRIVATE_KEY;

  if (!apiKeyName || !apiKeyPrivateKey) {
    throw new Error(
      "Missing CDP API credentials. Ensure CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY are set in environment variables."
    );
  }

  // Replace literal \n with actual newlines
  apiKeyPrivateKey = apiKeyPrivateKey.replace(/\\n/g, '\n');

  const currentTime = Math.floor(Date.now() / 1000);

  const payload = {
    iss: "cdp",
    sub: apiKeyName,
    nbf: currentTime,  // Changed from iat to nbf
    exp: currentTime + 120,
  };

  const token = jwt.sign(payload, apiKeyPrivateKey, {
    algorithm: "ES256",
    header: {
      kid: apiKeyName,
      nonce: crypto.randomBytes(16).toString('hex'),  // Added nonce
      typ: "JWT",
    },
  });

  return token;
}

// Convert snake_case to camelCase
function convertSnakeToCamelCase(obj) {
  if (Array.isArray(obj)) {
    return obj.map(convertSnakeToCamelCase);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = convertSnakeToCamelCase(obj[key]);
      return result;
    }, {});
  }
  return obj;
}

// Test endpoint - also tests Session Token API
app.get('/api/test', async (req, res) => {
  const hasApiKeyName = !!process.env.CDP_API_KEY_NAME;
  const hasApiKeyPrivateKey = !!process.env.CDP_API_KEY_PRIVATE_KEY;

  let jwtTestResult = null;
  try {
    const token = generateCDPJWT();
    jwtTestResult = { success: true, tokenLength: token.length };
  } catch (error) {
    jwtTestResult = { success: false, error: error.message };
  }

  // Test Session Token API (different endpoint that might have different permissions)
  let sessionTokenTest = null;
  try {
    const token = generateCDPJWT();
    const response = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addresses: [{
          address: '0x0000000000000000000000000000000000000000',
          blockchains: ['ethereum']
        }]
      }),
    });

    if (response.ok) {
      const data = await response.json();
      sessionTokenTest = { success: true, hasToken: !!data.token };
    } else {
      const errorText = await response.text();
      sessionTokenTest = { success: false, status: response.status, error: errorText };
    }
  } catch (error) {
    sessionTokenTest = { success: false, error: error.message };
  }

  res.json({
    message: 'API server is working!',
    env: {
      hasApiKeyName,
      hasApiKeyPrivateKey,
      apiKeyNameFormat: hasApiKeyName ? process.env.CDP_API_KEY_NAME.substring(0, 20) + '...' : 'missing',
      privateKeyFormat: hasApiKeyPrivateKey ?
        (process.env.CDP_API_KEY_PRIVATE_KEY.includes('BEGIN') ? 'PEM format' : 'Raw base64') :
        'missing',
    },
    jwtTest: jwtTestResult,
    sessionTokenTest,
  });
});

// Buy options endpoint
app.get('/api/onramp/buy-options', async (req, res) => {
  try {
    const { country, subdivision, networks } = req.query;

    if (!country) {
      return res.status(400).json({ error: 'Country is required' });
    }

    const token = generateCDPJWT();
    console.log('Generated JWT token (first 50 chars):', token.substring(0, 50) + '...');
    console.log('API Key Name:', process.env.CDP_API_KEY_NAME);

    const params = new URLSearchParams({ country });
    if (subdivision) params.append('subdivision', subdivision);
    if (networks) params.append('networks', networks);

    const apiUrl = `https://api.developer.coinbase.com/onramp/v1/buy/options?${params.toString()}`;
    console.log('Calling API:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Coinbase API Error:', response.status, errorData);
      return res.status(response.status).json({
        error: 'Failed to fetch buy options',
        details: errorData,
      });
    }

    const data = await response.json();
    const dataCamelCase = convertSnakeToCamelCase(data);

    res.json(dataCamelCase);
  } catch (error) {
    console.error('Buy options error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// Buy quote endpoint
app.post('/api/onramp/buy-quote', async (req, res) => {
  try {
    const {
      purchaseCurrency,
      purchaseNetwork,
      paymentAmount,
      paymentCurrency,
      paymentMethod,
      country,
      subdivision,
      destinationAddress,
    } = req.body;

    if (!purchaseCurrency || !paymentAmount || !paymentCurrency || !paymentMethod || !country) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['purchaseCurrency', 'paymentAmount', 'paymentCurrency', 'paymentMethod', 'country'],
      });
    }

    if (country === 'US' && !subdivision) {
      return res.status(400).json({
        error: 'State/subdivision is required for US',
      });
    }

    const token = generateCDPJWT();

    const quoteRequest = {
      purchase_currency: purchaseCurrency,
      payment_amount: paymentAmount.toString(),
      payment_currency: paymentCurrency,
      payment_method: paymentMethod,
      country,
    };

    if (purchaseNetwork) quoteRequest.purchase_network = purchaseNetwork;
    if (subdivision) quoteRequest.subdivision = subdivision;
    if (destinationAddress) quoteRequest.destination_address = destinationAddress;

    const response = await fetch(
      'https://api.developer.coinbase.com/onramp/v1/buy/quote',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quoteRequest),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Coinbase API Error:', response.status, errorData);
      return res.status(response.status).json({
        error: 'Failed to create buy quote',
        details: errorData,
      });
    }

    const data = await response.json();
    const dataCamelCase = convertSnakeToCamelCase(data);

    res.json(dataCamelCase);
  } catch (error) {
    console.error('Buy quote error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// ============= USER MANAGEMENT ENDPOINTS =============

// POST - Create or update user (email-wallet mapping)
// GET - Get user by email or wallet address
app.route('/api/users')
  .get((req, res) => {
    try {
      const { email, walletAddress } = req.query;

      if (!email && !walletAddress) {
        return res.status(400).json({
          error: 'Must provide either email or walletAddress query parameter',
        });
      }

      let user;
      if (email) {
        user = getUserByEmail(email);
      } else if (walletAddress) {
        user = getUserByWallet(walletAddress);
      }

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      return res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      console.error('Users API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
  .post((req, res) => {
    try {
      const { email, walletAddress } = req.body;

      if (!email || !walletAddress) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['email', 'walletAddress'],
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Invalid email format',
        });
      }

      // Validate wallet address (basic check)
      if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
        return res.status(400).json({
          error: 'Invalid wallet address format',
        });
      }

      const user = createOrUpdateUser(email, walletAddress);

      return res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      console.error('Users API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

// ============= DONATION TRACKING ENDPOINTS =============

// POST - Record a new donation
// GET - Get all donations or donations by email
app.route('/api/donations')
  .get((req, res) => {
    try {
      const { email } = req.query;

      let donations;
      if (email) {
        donations = getDonationsByEmail(email);
      } else {
        donations = getDonations();
      }

      // Sort by timestamp (newest first)
      donations.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return res.status(200).json({
        success: true,
        donations,
        count: donations.length,
      });
    } catch (error) {
      console.error('Donations API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
  .post((req, res) => {
    try {
      const { walletAddress, amount, txHash, blockNumber } = req.body;

      if (!walletAddress || !amount || !txHash || blockNumber === undefined) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['walletAddress', 'amount', 'txHash', 'blockNumber'],
        });
      }

      // Validate amount is a positive number
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({
          error: 'Invalid amount - must be a positive number',
        });
      }

      // Get user by wallet address to find their email
      const user = getUserByWallet(walletAddress);

      if (!user) {
        return res.status(404).json({
          error: 'User not found - wallet address not registered',
          hint: 'User must be registered via /api/users before creating donations',
        });
      }

      const donation = createDonation(
        user.email,
        walletAddress,
        amount,
        txHash,
        blockNumber
      );

      return res.status(201).json({
        success: true,
        donation,
      });
    } catch (error) {
      console.error('Donations API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

// ============= FIFO NOTIFICATION ENDPOINTS =============

// POST - Calculate and process FIFO notifications for a reimbursement
// GET - Preview FIFO notifications without processing
app.route('/api/fifo')
  .get((req, res) => {
    try {
      const { amount } = req.query;

      if (!amount) {
        return res.status(400).json({
          error: 'Amount query parameter is required',
        });
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({
          error: 'Invalid amount - must be a positive number',
        });
      }

      const notifications = calculateFIFONotifications(amount);

      return res.status(200).json({
        success: true,
        preview: true,
        notifications,
        summary: {
          totalAmount: amount,
          donorsAffected: notifications.length,
          message: `Preview: ${notifications.length} donor(s) would be notified`,
        },
      });
    } catch (error) {
      console.error('FIFO API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
  .post(async (req, res) => {
    try {
      const { amount, txHash, blockNumber, invoiceData } = req.body;

      if (!amount || !txHash || blockNumber === undefined || !invoiceData) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['amount', 'txHash', 'blockNumber', 'invoiceData'],
        });
      }

      // Validate amount is a positive number
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({
          error: 'Invalid amount - must be a positive number',
        });
      }

      // Record the reimbursement
      const reimbursement = createReimbursement(amount, txHash, blockNumber, invoiceData);

      // Process FIFO and get notifications
      const notifications = processReimbursement(amount);

      // Send email notifications to affected donors
      const emailResults = [];

      console.log('📧 Attempting to initialize email client...');
      const resend = getResendClient(); // Get the lazy-loaded client
      console.log('📧 Resend client initialized:', !!resend);
      console.log('📧 Notifications count:', notifications.length);

      if (resend && notifications.length > 0) {
        console.log(`Sending ${notifications.length} email notification(s)...`);

        for (const notification of notifications) {
          try {
            const emailData = {
              donorEmail: notification.email,
              amountSpent: notification.amountSpent,
              originalAmount: notification.originalAmount,
              percentageSpent: notification.percentageSpent,
              reimbursementAmount: amount,
              invoiceData,
              txHash,
              walletAddress: notification.walletAddress,
            };

            const { subject, html, text } = generateNotificationEmail(emailData);

            const result = await resend.emails.send({
              from: DEFAULT_FROM_EMAIL,
              to: notification.email,
              subject,
              html,
              text,
            });

            console.log(`✅ Email sent to ${notification.email}:`, result.data?.id);
            emailResults.push({
              email: notification.email,
              success: true,
            });
          } catch (error) {
            console.error(`❌ Failed to send email to ${notification.email}:`, error);
            emailResults.push({
              email: notification.email,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      } else {
        if (!resend) {
          console.warn('⚠️  Resend client not initialized - emails will not be sent');
          console.warn('⚠️  RESEND_API_KEY in env:', !!process.env.RESEND_API_KEY);
        }
        if (notifications.length === 0) {
          console.log('ℹ️  No donors to notify (no donations affected by this reimbursement)');
        }
      }

      return res.status(200).json({
        success: true,
        reimbursement,
        notifications,
        emailResults,
        summary: {
          totalAmount: amount,
          donorsAffected: notifications.length,
          emailsSent: emailResults.filter(r => r.success).length,
          emailsFailed: emailResults.filter(r => !r.success).length,
          message: `${notifications.length} donor(s) notified about this reimbursement`,
        },
      });
    } catch (error) {
      console.error('FIFO API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

app.listen(PORT, () => {
  console.log(`\n🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📡 API routes available at http://localhost:${PORT}/api/*\n`);
});
