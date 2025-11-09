import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateCDPJWT } from "../lib/auth";
import { convertSnakeToCamelCase } from "../lib/to-camel-case";

/**
 * Vercel Serverless Function: Create Onramp Buy Quote
 *
 * This endpoint creates a secure buy quote for funding a wallet via Onramp.
 * Called by the FundModal component when user initiates a purchase.
 *
 * API Docs: https://docs.cdp.coinbase.com/onramp-&-offramp/onramp-apis/generating-quotes
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      purchaseCurrency,
      purchaseNetwork,
      paymentAmount,
      paymentCurrency,
      paymentMethod,
      country,
      subdivision,
      destinationAddress,
    } = req.body;

    // Validate required fields
    if (
      !purchaseCurrency ||
      !paymentAmount ||
      !paymentCurrency ||
      !paymentMethod ||
      !country
    ) {
      return res.status(400).json({
        error: "Missing required fields",
        required: [
          "purchaseCurrency",
          "paymentAmount",
          "paymentCurrency",
          "paymentMethod",
          "country",
        ],
      });
    }

    // Validate US subdivision requirement
    if (country === "US" && !subdivision) {
      return res.status(400).json({
        error: "State/subdivision is required for US",
      });
    }

    // Generate JWT for CDP API authentication
    const token = generateCDPJWT();

    // Prepare request body for Coinbase Onramp API (using snake_case)
    const quoteRequest: any = {
      purchase_currency: purchaseCurrency,
      payment_amount: paymentAmount.toString(),
      payment_currency: paymentCurrency,
      payment_method: paymentMethod,
      country,
    };

    // Add optional fields
    if (purchaseNetwork) {
      quoteRequest.purchase_network = purchaseNetwork;
    }
    if (subdivision) {
      quoteRequest.subdivision = subdivision;
    }
    if (destinationAddress) {
      quoteRequest.destination_address = destinationAddress;
    }

    // Call Coinbase Onramp API to generate quote (correct base URL)
    const response = await fetch(
      "https://api.developer.coinbase.com/onramp/v1/buy/quote",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(quoteRequest),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Coinbase API Error:", response.status, errorData);

      try {
        const errorJson = JSON.parse(errorData);
        return res.status(response.status).json({
          error: errorJson.message || "Failed to create buy quote",
        });
      } catch {
        return res.status(response.status).json({
          error: "Failed to create buy quote",
          details: errorData,
        });
      }
    }

    // Convert snake_case response to camelCase (v1 API returns snake_case)
    const data = await response.json();
    const dataCamelCase = convertSnakeToCamelCase(data);

    return res.status(200).json(dataCamelCase);
  } catch (error) {
    console.error("Buy quote error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
