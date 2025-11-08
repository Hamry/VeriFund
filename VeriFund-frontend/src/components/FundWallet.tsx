import { useState } from "react";
import { useWallet } from "../contexts/WalletContext";

export const FundWallet: React.FC = () => {
  const { userAddress, userBalance, refreshBalance } = useWallet();
  const [amountUSD, setAmountUSD] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFundWallet = async () => {
    if (!amountUSD || parseFloat(amountUSD) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Opening Coinbase Onramp widget...");
      console.log("Amount USD:", amountUSD);
      console.log("Destination Address:", userAddress);

      // TODO: Integrate Coinbase Onramp SDK
      // Example implementation:
      // const onramp = new CoinbaseOnramp({
      //   appId: import.meta.env.VITE_COINBASE_ONRAMP_APP_ID,
      //   destinationAddress: userAddress,
      //   amount: amountUSD,
      //   currency: 'USD',
      //   onSuccess: () => {
      //     console.log('Funding successful!');
      //     refreshBalance();
      //   },
      //   onExit: () => {
      //     setIsLoading(false);
      //   }
      // });
      // onramp.open();

      alert(
        "TODO: Coinbase Onramp integration\n\nThis will open the Coinbase Onramp widget to fund your wallet with a credit card."
      );

      // Simulate success for demo purposes
      await refreshBalance();
    } catch (error) {
      console.error("Funding failed:", error);
      alert("Failed to open funding widget. See console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Fund Your Wallet
      </h2>

      <div className="mb-6">
        <p className="text-gray-700 dark:text-gray-300 mb-2">
          Welcome! To make a donation, first fund your wallet with cryptocurrency.
        </p>
        <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <span className="font-semibold">Your Wallet Address:</span>
          </p>
          <code className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded mt-1 block break-all text-gray-800 dark:text-gray-200">
            {userAddress}
          </code>
          <p className="text-sm text-blue-900 dark:text-blue-100 mt-2">
            <span className="font-semibold">Current Balance:</span>{" "}
            <span className="font-mono">{userBalance} ETH</span>
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Amount (USD)
          </label>
          <input
            id="amount"
            type="number"
            min="1"
            step="1"
            value={amountUSD}
            onChange={(e) => setAmountUSD(e.target.value)}
            placeholder="25"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Minimum: $1 USD
          </p>
        </div>

        <button
          onClick={handleFundWallet}
          disabled={isLoading || !amountUSD}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:cursor-not-allowed"
        >
          {isLoading ? "Opening Wallet..." : "Fund with Credit Card"}
        </button>

        <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <span className="font-semibold">Note:</span> This will open a secure
            Coinbase payment window where you can purchase ETH with a credit card.
            The funds will be sent directly to your wallet.
          </p>
        </div>
      </div>

      {/* Alternative funding methods */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Alternative: Send ETH Directly
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          If you already have ETH, you can send it directly to your wallet address
          above from any exchange or wallet.
        </p>
      </div>
    </div>
  );
};
