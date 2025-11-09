/**
 * Resend email client configuration
 * Using lazy initialization to ensure env vars are loaded first
 */

import { Resend } from 'resend';

let resendInstance = null;
let initialized = false;

// Lazy getter for resend client - call this function to get the client
export function getResendClient() {
  if (!initialized) {
    initialized = true;
    const resendApiKey = process.env.RESEND_API_KEY;

    console.log('🔍 Initializing Resend client...');
    console.log('   RESEND_API_KEY exists:', !!resendApiKey);
    console.log('   RESEND_API_KEY length:', resendApiKey ? resendApiKey.length : 0);
    console.log('   RESEND_API_KEY preview:', resendApiKey ? resendApiKey.substring(0, 10) + '...' : 'undefined');

    if (!resendApiKey) {
      console.warn('⚠️  RESEND_API_KEY is not set - email notifications will not be sent');
      resendInstance = null;
    } else {
      resendInstance = new Resend(resendApiKey);
      console.log('✅ Resend client initialized successfully');
    }
  }

  return resendInstance;
}

// Default sender email (Resend's test email)
// For production, replace with your verified domain email
export const DEFAULT_FROM_EMAIL = 'onboarding@resend.dev';
