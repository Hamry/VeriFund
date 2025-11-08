import { useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../contexts/WalletContext";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../web3-config";

export const MakeDonation: React.FC = () => {
  const { userAddress, userBalance, embeddedSigner, refreshBalance } =
    useWallet();
  const [donationAmount, setDonationAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string>("");

  const handleDonate = async () => {
    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      alert("Please enter a valid donation amount");
      return;
    }

    const donationFloat = parseFloat(donationAmount);
    const balanceFloat = parseFloat(userBalance);

    if (donationFloat > balanceFloat) {
      alert("Insufficient balance");
      return;
    }

    if (!embeddedSigner && !userAddress) {
      alert("Wallet not connected. Please try logging in again.");
      return;
    }

    setIsLoading(true);
    setTxHash("");

    try {
      console.log("Preparing donation transaction...");
      console.log("Amount:", donationAmount, "ETH");
      console.log("From:", userAddress);

      // TODO: Use actual embedded wallet signer when Coinbase SDK is integrated
      // For now, we'll show a placeholder message

      if (!embeddedSigner) {
        alert(
          "TODO: Coinbase Embedded Wallet SDK integration\n\n" +
            `This would send ${donationAmount} ETH from your wallet (${userAddress}) ` +
            `to the charity vault at ${CONTRACT_ADDRESS}.\n\n` +
            "Once the SDK is integrated, this will:\n" +
            "1. Create a contract instance with your signer\n" +
            "2. Call the donate() function\n" +
            "3. Wait for transaction confirmation"
        );

        // Simulate transaction for demo
        console.log("Simulating donation transaction...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setTxHash("0x" + "1234567890abcdef".repeat(4)); // Fake tx hash

        alert("Donation simulated successfully!");
        setDonationAmount("");
        await refreshBalance();
        return;
      }

      // When SDK is integrated, this code will execute:
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        embeddedSigner
      );

      const tx = await contract.donate({
        value: ethers.parseEther(donationAmount),
      });

      console.log("Transaction sent:", tx.hash);
      setTxHash(tx.hash);

      // Wait for confirmation
      console.log("Waiting for confirmation...");
      await tx.wait();

      console.log("Donation confirmed!");
      alert("Thank you for your donation!");

      // Reset form and refresh balance
      setDonationAmount("");
      await refreshBalance();
    } catch (error) {
      console.error("Donation failed:", error);
      alert(
        "Donation failed. See console for details.\n\n" +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Make a Donation
      </h2>

      {/* Wallet Info */}
      <div className="mb-6 bg-green-50 dark:bg-green-900 rounded-lg p-4">
        <p className="text-sm text-green-900 dark:text-green-100 mb-1">
          <span className="font-semibold">Your Wallet:</span>
        </p>
        <code className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded block break-all mb-2 text-gray-800 dark:text-gray-200">
          {userAddress}
        </code>
        <p className="text-lg font-bold text-green-700 dark:text-green-300">
          Available: {userBalance} ETH
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

        {txHash && (
          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold mb-1">
              Transaction Hash:
            </p>
            <code className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded block break-all text-gray-800 dark:text-gray-200">
              {txHash}
            </code>
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
            >
              View on Etherscan →
            </a>
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
