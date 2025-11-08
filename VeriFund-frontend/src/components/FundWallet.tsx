import { useCurrentUser } from "@coinbase/cdp-hooks";
import { useState } from "react";

export const FundWallet: React.FC = () => {
  const { currentUser } = useCurrentUser();
  const smartAccount = currentUser?.evmSmartAccounts?.[0];
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    if (!smartAccount) return;
    navigator.clipboard.writeText(smartAccount);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Fund Your Wallet
      </h2>

      <p className="text-gray-700 dark:text-gray-300 mb-6">
        To make a donation, you'll need to add Sepolia testnet ETH to your wallet.
        You can get test ETH from a faucet or transfer from another wallet.
      </p>

      {/* Wallet Address Display */}
      <div className="mb-6 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100 mb-2">
          <span className="font-semibold">Your Wallet Address:</span>
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-white dark:bg-gray-700 px-3 py-2 rounded break-all text-gray-800 dark:text-gray-200">
            {smartAccount}
          </code>
          <button
            onClick={handleCopyAddress}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors whitespace-nowrap"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-blue-800 dark:text-blue-200 mt-3">
          This is a Smart Account - gas fees are sponsored when you donate!
        </p>
      </div>

      {/* Instructions */}
      <div className="space-y-4">
        <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-4">
          <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
            Option 1: Get Sepolia Test ETH (Free)
          </p>
          <p className="text-xs text-green-800 dark:text-green-200 mb-3">
            Use a faucet to get free Sepolia testnet ETH:
          </p>
          <ul className="text-xs text-green-800 dark:text-green-200 space-y-2">
            <li>
              <a
                href="https://www.alchemy.com/faucets/ethereum-sepolia"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-green-600 dark:hover:text-green-400"
              >
                Alchemy Sepolia Faucet →
              </a>
            </li>
            <li>
              <a
                href="https://sepoliafaucet.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-green-600 dark:hover:text-green-400"
              >
                Sepolia PoW Faucet →
              </a>
            </li>
            <li>
              <a
                href="https://www.infura.io/faucet/sepolia"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-green-600 dark:hover:text-green-400"
              >
                Infura Sepolia Faucet →
              </a>
            </li>
          </ul>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
          <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">
            Option 2: Transfer from Another Wallet
          </p>
          <p className="text-xs text-purple-800 dark:text-purple-200">
            Send Sepolia ETH from MetaMask, Coinbase Wallet, or any other wallet to the address above.
          </p>
        </div>
      </div>
    </div>
  );
};
