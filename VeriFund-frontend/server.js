import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Load environment variables
dotenv.config({ path: '.env.local' });

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

app.listen(PORT, () => {
  console.log(`\n🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📡 API routes available at http://localhost:${PORT}/api/*\n`);
});
