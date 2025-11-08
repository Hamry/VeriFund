/**
 * API Endpoint: /api/donations
 * POST - Record a new donation
 * GET - Get all donations or donations by email
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createDonation, getDonations, getDonationsByEmail, getUserByWallet } from './lib/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      // Record a new donation
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
    }

    if (req.method === 'GET') {
      // Get donations (all or by email)
      const { email } = req.query;

      let donations;
      if (email) {
        donations = getDonationsByEmail(email as string);
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
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Donations API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
