import jwt from "jsonwebtoken";

/**
 * Generates a JWT token for authenticating with Coinbase CDP APIs
 * Required for backend Onramp API calls
 */
export function generateCDPJWT(): string {
  const apiKeyName = process.env.CDP_API_KEY_NAME;
  const apiKeyPrivateKey = process.env.CDP_API_KEY_PRIVATE_KEY;

  if (!apiKeyName || !apiKeyPrivateKey) {
    throw new Error(
      "Missing CDP API credentials. Ensure CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY are set in environment variables."
    );
  }

  // JWT payload for CDP authentication
  const payload = {
    iss: "cdp", // Issuer
    sub: apiKeyName, // Subject (your API key name)
    iat: Math.floor(Date.now() / 1000), // Issued at
    exp: Math.floor(Date.now() / 1000) + 120, // Expires in 2 minutes
  };

  // Sign the JWT with ES256 algorithm
  const token = jwt.sign(payload, apiKeyPrivateKey, {
    algorithm: "ES256",
    header: {
      kid: apiKeyName, // Key ID
      typ: "JWT",
    },
  });

  return token;
}
