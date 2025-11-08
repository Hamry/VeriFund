import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useCurrentUser, useSendUserOperation } from "@coinbase/cdp-hooks";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../web3-config";

export const MakeDonation: React.FC = () => {
  const { currentUser } = useCurrentUser();
  const { sendUserOperation, status, data, error } = useSendUserOperation();
  const smartAccount = currentUser?.evmSmartAccounts?.[0];

  const [donationAmount, setDonationAmount] = useState<string>("");
  const [balance, setBalance] = useState<string>("0");

  // Fetch balance on mount and when smart account changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (!smartAccount) return;

      try {
        const rpcUrl = import.meta.env.VITE_RPC_URL;
        if (!rpcUrl) return;

        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const balanceWei = await provider.getBalance(smartAccount);
        const balanceEth = ethers.formatEther(balanceWei);
        setBalance(balanceEth);
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      }
    };

    fetchBalance();
    // Refresh balance every 10 seconds
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [smartAccount]);

  const handleDonate = async () => {
    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      alert("Please enter a valid donation amount");
      return;
    }

    const donationFloat = parseFloat(donationAmount);
    const balanceFloat = parseFloat(balance);

    if (donationFloat > balanceFloat) {
      alert("Insufficient balance. Please fund your wallet first.");
      return;
    }

    if (!smartAccount) {
      alert("Wallet not ready. Please try again.");
      return;
    }

    try {
      console.log("Preparing donation via Smart Account...");
      console.log("Amount:", donationAmount, "ETH");
      console.log("From Smart Account:", smartAccount);
      console.log("To Contract:", CONTRACT_ADDRESS);

      // Encode the donate() function call
      const contractInterface = new ethers.Interface(CONTRACT_ABI);
      const donateCalldata = contractInterface.encodeFunctionData("donate");

      // Send user operation via Smart Account using the hook
      // Note: Gas sponsorship only works on Base networks
      const result = await sendUserOperation({
        evmSmartAccount: smartAccount,
        network: "ethereum-sepolia",
        calls: [
          {
            to: CONTRACT_ADDRESS,
            value: ethers.parseEther(donationAmount),
            data: donateCalldata,
          },
        ],
      });

      console.log("User operation sent:", result.userOperationHash);

      // Reset form on success
      setDonationAmount("");
    } catch (err) {
      console.error("Donation failed:", err);
      alert(
        "Donation failed. Please try again.\n\n" +
          (err instanceof Error ? err.message : String(err))
      );
    }
  };

  if (!smartAccount) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <p className="text-gray-600 dark:text-gray-400">
          Loading wallet...
        </p>
      </div>
    );
  }

  const isLoading = status === "pending";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Make a Donation
      </h2>

      {/* Wallet Info */}
      <div className="mb-6 bg-green-50 dark:bg-green-900 rounded-lg p-4">
        <p className="text-sm text-green-900 dark:text-green-100 mb-1">
          <span className="font-semibold">Your Smart Account:</span>
        </p>
        <code className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded block break-all mb-2 text-gray-800 dark:text-gray-200">
          {smartAccount}
        </code>
        <p className="text-lg font-bold text-green-700 dark:text-green-300">
          Available: {balance} ETH
        </p>
        <p className="text-xs text-green-800 dark:text-green-200 mt-1">
          ⚠️ Note: Gas sponsorship only works on Base networks
        </p>
      </div>

      {/* Donation Form */}
      <div className="space-y-4">
        <div>
          <label
            htmlFor="donationAmount"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Donation Amount (ETH)
          </label>
          <input
            id="donationAmount"
            type="number"
            min="0"
            step="0.001"
            value={donationAmount}
            onChange={(e) => setDonationAmount(e.target.value)}
            placeholder="0.01"
            disabled={isLoading}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-600"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Minimum: 0.001 ETH
          </p>
        </div>

        {/* Quick amount buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setDonationAmount("0.01")}
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50 text-gray-800 dark:text-gray-200"
          >
            0.01 ETH
          </button>
          <button
            onClick={() => setDonationAmount("0.05")}
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50 text-gray-800 dark:text-gray-200"
          >
            0.05 ETH
          </button>
          <button
            onClick={() => setDonationAmount("0.1")}
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50 text-gray-800 dark:text-gray-200"
          >
            0.1 ETH
          </button>
        </div>

        <button
          onClick={handleDonate}
          disabled={isLoading || !donationAmount}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:cursor-not-allowed"
        >
          {isLoading ? "Processing..." : "Donate to Vault"}
        </button>

        {/* Status Messages */}
        {status === "pending" && data && (
          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold mb-1">
              User Operation Hash:
            </p>
            <code className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded block break-all text-gray-800 dark:text-gray-200">
              {data.userOpHash}
            </code>
            <p className="text-xs text-blue-800 dark:text-blue-200 mt-2">
              Waiting for confirmation...
            </p>
          </div>
        )}

        {status === "success" && data && (
          <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-4">
            <p className="text-sm text-green-900 dark:text-green-100 font-semibold mb-1">
              Donation Successful! 🎉
            </p>
            <p className="text-xs text-green-800 dark:text-green-200 mb-2">
              Transaction Hash:
            </p>
            <code className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded block break-all text-gray-800 dark:text-gray-200">
              {data.transactionHash}
            </code>
            <a
              href={`https://sepolia.etherscan.io/tx/${data.transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-600 dark:text-green-400 hover:underline mt-2 inline-block"
            >
              View on Etherscan →
            </a>
          </div>
        )}

        {status === "error" && error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <p className="text-sm text-red-900 dark:text-red-100 font-semibold mb-1">
              Error:
            </p>
            <p className="text-xs text-red-800 dark:text-red-200">
              {error.message}
            </p>
          </div>
        )}

        <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <span className="font-semibold">Your donation is:</span>
          </p>
          <ul className="text-sm text-yellow-800 dark:text-yellow-200 mt-1 ml-4 list-disc">
            <li>100% transparent and tracked on the blockchain</li>
            <li>Associated with your unique wallet address</li>
            <li>Immediately reflected in the public ledger</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
