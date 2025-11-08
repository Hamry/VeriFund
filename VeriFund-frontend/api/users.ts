/**
 * API Endpoint: /api/users
 * POST - Create or update user (email-wallet mapping)
 * GET - Get user by email or wallet address
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createOrUpdateUser, getUserByEmail, getUserByWallet } from './lib/storage';

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
      // Create or update user
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
    }

    if (req.method === 'GET') {
      // Get user by email or wallet address
      const { email, walletAddress } = req.query;

      if (!email && !walletAddress) {
        return res.status(400).json({
          error: 'Must provide either email or walletAddress query parameter',
        });
      }

      let user;
      if (email) {
        user = getUserByEmail(email as string);
      } else if (walletAddress) {
        user = getUserByWallet(walletAddress as string);
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
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
