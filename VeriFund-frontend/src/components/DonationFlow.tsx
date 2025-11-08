import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import { useCurrentUser } from "@coinbase/cdp-hooks";
import { FundWallet } from "./FundWallet";
import { MakeDonation } from "./MakeDonation";

export const DonationFlow: React.FC = () => {
  const { currentUser } = useCurrentUser();
  const smartAccount = currentUser?.evmSmartAccounts?.[0];

  // User is not logged in
  if (!currentUser) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Donate to VeriFund
        </h2>

        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Sign in with your email to create a secure wallet and make a donation.
          Your wallet will be created automatically - no seed phrases or crypto
          knowledge required!
        </p>

        {/* Coinbase AuthButton handles the entire login flow */}
        <AuthButton />

        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mt-6">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <span className="font-semibold">How it works:</span>
          </p>
          <ol className="text-sm text-blue-900 dark:text-blue-100 mt-2 ml-4 list-decimal space-y-1">
            <li>Sign in with your email (no password needed)</li>
            <li>We'll create a secure crypto wallet for you</li>
            <li>Enter donation amount and fund with credit card</li>
            <li>Donate to the charity vault (gas fees sponsored!)</li>
          </ol>
        </div>
      </div>
    );
  }

  // User is logged in
  return (
    <div className="space-y-6">
      {/* User info card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Logged in as:
            </p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {currentUser.email || "User"}
            </p>
            {smartAccount && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                {smartAccount.slice(0, 6)}...
                {smartAccount.slice(-4)}
              </p>
            )}
          </div>
          <AuthButton />
        </div>
      </div>

      {/* Donation interface */}
      <MakeDonation />

      {/* Optional: Add more funds */}
      <details className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <summary className="cursor-pointer p-4 font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
          Need to add more funds?
        </summary>
        <div className="p-4 pt-0">
          <FundWallet />
        </div>
      </details>
    </div>
  );
};
