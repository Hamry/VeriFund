/**
 * Email template for FIFO donation notifications
 */

export interface NotificationEmailData {
  donorEmail: string;
  amountSpent: string;
  originalAmount: string;
  percentageSpent: number;
  reimbursementAmount: string;
  invoiceData: string;
  txHash: string;
  walletAddress: string;
}

export function generateNotificationEmail(data: NotificationEmailData): { subject: string; html: string; text: string } {
  const subject = `VeriFund: Your Donation Was Used - ${data.amountSpent} ETH`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Donation Was Used</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                VeriFund
              </h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">
                Transparent Charity Donations
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">

              <!-- Greeting -->
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                Your Donation Was Used! 🎉
              </h2>

              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Great news! Part of your generous donation to VeriFund has been used for a charitable expense.
              </p>

              <!-- Donation Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 12px 0; color: #065f46; font-size: 16px; font-weight: 600;">
                      Your Contribution
                    </h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 6px 0; color: #047857; font-size: 14px;">Amount Used:</td>
                        <td align="right" style="padding: 6px 0; color: #065f46; font-size: 14px; font-weight: 600;">
                          ${data.amountSpent} ETH
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #047857; font-size: 14px;">Your Original Donation:</td>
                        <td align="right" style="padding: 6px 0; color: #065f46; font-size: 14px;">
                          ${data.originalAmount} ETH
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #047857; font-size: 14px;">Percentage Used:</td>
                        <td align="right" style="padding: 6px 0; color: #065f46; font-size: 14px;">
                          ${data.percentageSpent.toFixed(1)}%
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Expense Details -->
              <h3 style="margin: 30px 0 12px 0; color: #1f2937; font-size: 18px; font-weight: 600;">
                How Your Donation Was Used
              </h3>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                      <strong>Expense Description:</strong><br/>
                      ${escapeHtml(data.invoiceData)}
                    </p>
                    <p style="margin: 12px 0 0 0; color: #1e40af; font-size: 14px;">
                      <strong>Total Reimbursement:</strong> ${data.reimbursementAmount} ETH
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Blockchain Verification -->
              <div style="margin: 30px 0; padding: 20px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px; font-weight: 600;">
                  🔐 Blockchain Verified
                </h3>
                <p style="margin: 0 0 12px 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                  This transaction is permanently recorded on the Ethereum blockchain for complete transparency.
                </p>
                <p style="margin: 0; font-size: 12px;">
                  <a href="https://sepolia.etherscan.io/tx/${data.txHash}"
                     style="color: #d97706; text-decoration: underline; word-break: break-all;">
                    View Transaction on Etherscan →
                  </a>
                </p>
              </div>

              <!-- Your Wallet Info -->
              <p style="margin: 20px 0 0 0; padding: 12px; background-color: #f3f4f6; border-radius: 6px; color: #6b7280; font-size: 12px; font-family: monospace; word-break: break-all;">
                Your Wallet: ${data.walletAddress}
              </p>

              <!-- Thank You -->
              <p style="margin: 30px 0 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Thank you for making a difference! Your donation is helping create real impact, and every transaction is tracked transparently on the blockchain.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                VeriFund - Transparent Blockchain Charity
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Network: Ethereum Sepolia Testnet
              </p>
              <p style="margin: 12px 0 0 0; color: #9ca3af; font-size: 12px;">
                This is an automated notification from VeriFund's FIFO tracking system.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
VeriFund: Your Donation Was Used!

Great news! Part of your generous donation to VeriFund has been used for a charitable expense.

YOUR CONTRIBUTION:
- Amount Used: ${data.amountSpent} ETH
- Your Original Donation: ${data.originalAmount} ETH
- Percentage Used: ${data.percentageSpent.toFixed(1)}%

HOW YOUR DONATION WAS USED:
${data.invoiceData}

Total Reimbursement: ${data.reimbursementAmount} ETH

BLOCKCHAIN VERIFICATION:
This transaction is permanently recorded on the Ethereum blockchain.
View on Etherscan: https://sepolia.etherscan.io/tx/${data.txHash}

Your Wallet: ${data.walletAddress}

Thank you for making a difference! Your donation is helping create real impact.

---
VeriFund - Transparent Blockchain Charity
Network: Ethereum Sepolia Testnet
  `.trim();

  return { subject, html, text };
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
