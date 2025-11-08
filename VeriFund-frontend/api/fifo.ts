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
import { resend, DEFAULT_FROM_EMAIL } from './lib/resend-client';
import { generateNotificationEmail, type NotificationEmailData } from './lib/email-template';

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

      // Send email notifications to affected donors
      const emailResults: Array<{ email: string; success: boolean; error?: string }> = [];

      if (resend && notifications.length > 0) {
        console.log(`Sending ${notifications.length} email notification(s)...`);

        for (const notification of notifications) {
          try {
            const emailData: NotificationEmailData = {
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
      } else if (!resend) {
        console.warn('⚠️  Resend client not initialized - emails will not be sent');
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
