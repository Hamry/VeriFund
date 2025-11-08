import { useCallback } from "react";
import { FundModal, type FundModalProps } from "@coinbase/cdp-react";
import { useCurrentUser } from "@coinbase/cdp-hooks";
import { getBuyOptions, createBuyQuote } from "../lib/onramp-api";

export const FundWallet: React.FC = () => {
  const { currentUser } = useCurrentUser();
  const smartAccount = currentUser?.evmSmartAccounts?.[0];

  // User's country - in production, detect via IP geolocation
  const userCountry = "US";
  const userSubdivision = userCountry === "US" ? "CA" : undefined; // State required for US

  // Fetch buy options (available payment methods, assets)
  const fetchBuyOptions: FundModalProps["fetchBuyOptions"] = useCallback(
    async (params) => {
      console.log("Fetching buy options:", params);
      return getBuyOptions(params);
    },
    []
  );

  // Create buy quote (session token)
  const fetchBuyQuote: FundModalProps["fetchBuyQuote"] = useCallback(
    async (params) => {
      console.log("Creating buy quote:", params);
      return createBuyQuote(params);
    },
    []
  );

  // Handle successful funding
  const handleSuccess = useCallback(() => {
    console.log("Funding successful!");
    alert("Funding successful! Your wallet has been funded.");
  }, []);

  if (!smartAccount) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <p className="text-gray-600 dark:text-gray-400">
          Loading wallet...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Fund Your Wallet
      </h2>

      <p className="text-gray-700 dark:text-gray-300 mb-6">
        Add funds to your wallet using a credit card or debit card. Your funds
        will be available instantly.
      </p>

      {/* Coinbase FundModal component */}
      <FundModal
        country={userCountry}
        subdivision={userSubdivision}
        cryptoCurrency="eth" // ETH for Sepolia testnet
        fiatCurrency="usd"
        fetchBuyQuote={fetchBuyQuote}
        fetchBuyOptions={fetchBuyOptions}
        network="ethereum-sepolia" // Sepolia testnet
        presetAmountInputs={[10, 25, 50, 100]} // Quick select amounts
        onSuccess={handleSuccess}
        destinationAddress={smartAccount}
      />

      <div className="mt-6 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <span className="font-semibold">Your Smart Account:</span>
        </p>
        <code className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded mt-1 block break-all text-gray-800 dark:text-gray-200">
          {smartAccount}
        </code>
        <p className="text-xs text-blue-800 dark:text-blue-200 mt-2">
          This is a Smart Account with gas sponsorship - you don't need to worry
          about gas fees when donating!
        </p>
      </div>
    </div>
  );
};
