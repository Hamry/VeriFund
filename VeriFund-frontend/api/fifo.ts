/**
 * API Endpoint: /api/fifo
 * POST - Calculate and process FIFO notifications for a reimbursement
 * GET - Preview FIFO notifications without processing
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  calculateFIFONotifications,
  processReimbursement,
  createReimbursement,
} from './lib/storage';

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
      // Process a reimbursement and update donation tracking
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

      return res.status(200).json({
        success: true,
        reimbursement,
        notifications,
        summary: {
          totalAmount: amount,
          donorsAffected: notifications.length,
          message: `${notifications.length} donor(s) will be notified about this reimbursement`,
        },
      });
    }

    if (req.method === 'GET') {
      // Preview FIFO notifications without processing
      const { amount } = req.query;

      if (!amount) {
        return res.status(400).json({
          error: 'Amount query parameter is required',
        });
      }

      const amountNum = parseFloat(amount as string);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({
          error: 'Invalid amount - must be a positive number',
        });
      }

      const notifications = calculateFIFONotifications(amount as string);

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
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('FIFO API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
