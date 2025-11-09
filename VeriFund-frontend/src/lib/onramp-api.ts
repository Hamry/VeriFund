/**
 * Client-side API utilities for calling Onramp backend endpoints
 */

export interface BuyOptionsParams {
  country: string;
  subdivision?: string; // Required for US
}

export interface BuyQuoteParams {
  purchaseCurrency: string;
  purchaseNetwork?: string;
  paymentAmount: number | string;
  paymentCurrency: string;
  paymentMethod: string;
  country: string;
  subdivision?: string;
  destinationAddress?: string;
}

/**
 * Fetch available buy options (payment methods, assets) for a country
 */
export async function getBuyOptions(params: BuyOptionsParams) {
  // Build query string from params
  const queryParams = new URLSearchParams({ country: params.country });
  if (params.subdivision) {
    queryParams.append("subdivision", params.subdivision);
  }

  const response = await fetch(`/api/onramp/buy-options?${queryParams.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch buy options");
  }

  return response.json();
}

/**
 * Create a buy quote (session token) for purchasing crypto
 */
export async function createBuyQuote(params: BuyQuoteParams) {
  const response = await fetch("/api/onramp/buy-quote", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create buy quote");
  }

  return response.json();
}
