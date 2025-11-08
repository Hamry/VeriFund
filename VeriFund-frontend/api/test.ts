import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Simple test endpoint to verify API routes are working
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  return res.status(200).json({
    message: "API is working!",
    env: {
      hasApiKeyName: !!process.env.CDP_API_KEY_NAME,
      hasApiKeyPrivateKey: !!process.env.CDP_API_KEY_PRIVATE_KEY,
    },
  });
}
