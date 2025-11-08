/**
 * Resend email client configuration
 */

import { Resend } from 'resend';

// Initialize Resend client
const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn('⚠️  RESEND_API_KEY is not set - email notifications will not be sent');
}

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Default sender email (Resend's test email)
// For production, replace with your verified domain email
export const DEFAULT_FROM_EMAIL = 'onboarding@resend.dev';
