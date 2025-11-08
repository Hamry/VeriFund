import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../contexts/WalletContext";
import { CONTRACT_ADDRESS, CONTRACT_ABI, contract } from "../web3-config";

export const ReimbursementForm: React.FC = () => {
  const { adminSigner } = useWallet();
  const [amount, setAmount] = useState<string>("");
  const [invoiceData, setInvoiceData] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string>("");
  const [vaultBalance, setVaultBalance] = useState<string>("0");

  // Fetch vault balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const balance: bigint = await contract.getBalance();
        setVaultBalance(ethers.formatEther(balance));
      } catch (error) {
        console.error("Failed to fetch vault balance:", error);
      }
    };

    fetchBalance();

    // Refresh balance when reimbursements happen
    const handleReimbursement = () => {
      fetchBalance();
    };

    contract.on("ReimbursementPaid", handleReimbursement);

    return () => {
      contract.off("ReimbursementPaid", handleReimbursement);
    };
  }, []);

  const handleRequestReimbursement = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (!invoiceData || invoiceData.trim().length === 0) {
      alert("Please provide invoice/expense description");
      return;
    }

    const amountFloat = parseFloat(amount);
    const balanceFloat = parseFloat(vaultBalance);

    if (amountFloat > balanceFloat) {
      alert("Insufficient vault balance");
      return;
    }

    if (!adminSigner) {
      alert("Admin wallet not connected");
      return;
    }

    setIsLoading(true);
    setTxHash("");

    try {
      console.log("Requesting reimbursement...");
      console.log("Amount:", amount, "ETH");
      console.log("Invoice:", invoiceData);

      // Create contract instance with admin signer
      const adminContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        adminSigner
      );

      // Call requestReimbursement function
      const tx = await adminContract.requestReimbursement(
        ethers.parseEther(amount),
        invoiceData
      );

      console.log("Transaction sent:", tx.hash);
      setTxHash(tx.hash);

      // Wait for confirmation
      console.log("Waiting for confirmation...");
      await tx.wait();

      console.log("Reimbursement confirmed!");
      alert("Reimbursement successful!");

      // Reset form
      setAmount("");
      setInvoiceData("");
    } catch (error) {
      console.error("Reimbursement failed:", error);
      let errorMessage = "Reimbursement request failed.";

      if (error instanceof Error) {
        if (error.message.includes("Only charity can request")) {
          errorMessage = "You are not authorized to request reimbursements.";
        } else if (error.message.includes("user rejected")) {
          errorMessage = "Transaction was rejected.";
        } else {
          errorMessage = error.message;
        }
      }

      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Request Reimbursement
      </h2>

      {/* Vault Balance */}
      <div className="mb-6 bg-purple-50 dark:bg-purple-900 rounded-lg p-4">
        <p className="text-sm text-purple-900 dark:text-purple-100 mb-1">
          Available Vault Balance:
        </p>
        <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
          {vaultBalance} ETH
        </p>
      </div>

      {/* Reimbursement Form */}
      <div className="space-y-4">
        <div>
          <label
            htmlFor="reimbursementAmount"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Reimbursement Amount (ETH)
          </label>
          <input
            id="reimbursementAmount"
            type="number"
            min="0"
            step="0.001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.05"
            disabled={isLoading}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-600"
          />
        </div>

        <div>
          <label
            htmlFor="invoiceData"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Invoice / Expense Description
          </label>
          <textarea
            id="invoiceData"
            value={invoiceData}
            onChange={(e) => setInvoiceData(e.target.value)}
            placeholder="e.g., Medical supplies - Invoice #12345"
            rows={4}
            disabled={isLoading}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-600 resize-none"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            This information will be recorded on the blockchain for transparency
          </p>
        </div>

        <button
          onClick={handleRequestReimbursement}
          disabled={isLoading || !amount || !invoiceData}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:cursor-not-allowed"
        >
          {isLoading ? "Processing..." : "Request Reimbursement"}
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
            <span className="font-semibold">Important:</span> All reimbursement
            requests are:
          </p>
          <ul className="text-sm text-yellow-800 dark:text-yellow-200 mt-1 ml-4 list-disc">
            <li>Permanently recorded on the blockchain</li>
            <li>Visible in the public ledger with invoice details</li>
            <li>Subject to community review and oversight</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
