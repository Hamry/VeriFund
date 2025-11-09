import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateCDPJWT } from "../lib/auth";
import { convertSnakeToCamelCase } from "../lib/to-camel-case";

/**
 * Vercel Serverless Function: Get Onramp Buy Options
 *
 * This endpoint fetches available payment methods and assets for a given country.
 * Called by the FundModal component to display funding options to users.
 *
 * API Docs: https://docs.cdp.coinbase.com/api-reference/rest-api/onramp-offramp/get-buy-options
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests (per Coinbase docs)
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Extract query parameters
    const { country, subdivision, networks } = req.query;

    if (!country || typeof country !== "string") {
      return res.status(400).json({ error: "Country is required" });
    }

    // Generate JWT for CDP API authentication
    const token = generateCDPJWT();

    // Build query parameters
    const params = new URLSearchParams({ country });
    if (subdivision && typeof subdivision === "string") {
      params.append("subdivision", subdivision);
    }
    if (networks && typeof networks === "string") {
      params.append("networks", networks);
    }

    const queryString = params.toString();
    const apiPath = "/v1/buy/options";

    // Call Coinbase Onramp API (correct base URL)
    const response = await fetch(
      `https://api.developer.coinbase.com/onramp${apiPath}?${queryString}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Coinbase API Error:", response.status, errorData);

      try {
        const errorJson = JSON.parse(errorData);
        return res.status(response.status).json({
          error: errorJson.message || "Failed to fetch buy options",
        });
      } catch {
        return res.status(response.status).json({
          error: "Failed to fetch buy options",
          details: errorData,
        });
      }
    }

    // Convert snake_case response to camelCase (v1 API returns snake_case)
    const data = await response.json();
    const dataCamelCase = convertSnakeToCamelCase(data);

    return res.status(200).json(dataCamelCase);
  } catch (error) {
    console.error("Buy options error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
