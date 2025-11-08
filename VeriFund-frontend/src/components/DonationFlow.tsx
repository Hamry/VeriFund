import { useState } from "react";
import { useWallet } from "../contexts/WalletContext";
import { FundWallet } from "./FundWallet";
import { MakeDonation } from "./MakeDonation";

export const DonationFlow: React.FC = () => {
  const { userStatus, userEmail, loginWithEmail, logout } = useWallet();
  const [email, setEmail] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const handleLogin = async () => {
    if (!email || !email.includes("@")) {
      alert("Please enter a valid email address");
      return;
    }

    setIsLoggingIn(true);

    try {
      await loginWithEmail(email);
      setEmail(""); // Clear input after successful login
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // STATE 1: LOGGED_OUT
  if (userStatus === "LOGGED_OUT") {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Donate to CharityVault
        </h2>

        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Sign in with your email to create a secure wallet and make a donation.
          Your wallet will be created automatically and you'll be able to fund it
          with a credit card.
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleLogin();
                }
              }}
              placeholder="your.email@example.com"
              disabled={isLoggingIn}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-600"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={isLoggingIn || !email}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? "Creating Wallet..." : "Sign in with Email to Donate"}
          </button>

          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <span className="font-semibold">How it works:</span>
            </p>
            <ol className="text-sm text-blue-900 dark:text-blue-100 mt-2 ml-4 list-decimal space-y-1">
              <li>Sign in with your email (no password needed)</li>
              <li>We'll create a secure crypto wallet for you</li>
              <li>Fund your wallet with a credit card</li>
              <li>Donate to the charity vault</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // STATE 2: LOGGED_IN (but not funded)
  if (userStatus === "LOGGED_IN") {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Logged in as:
              </p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {userEmail}
              </p>
            </div>
            <button
              onClick={logout}
              className="text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Logout
            </button>
          </div>
        </div>

        <FundWallet />
      </div>
    );
  }

  // STATE 3: FUNDED (can now donate)
  if (userStatus === "FUNDED") {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Logged in as:
              </p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {userEmail}
              </p>
            </div>
            <button
              onClick={logout}
              className="text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Logout
            </button>
          </div>
        </div>

        <MakeDonation />

        {/* Option to add more funds */}
        <details className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <summary className="cursor-pointer p-4 font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
            Need more funds? Click to add more
          </summary>
          <div className="p-4 pt-0">
            <FundWallet />
          </div>
        </details>
      </div>
    );
  }

  return null;
};
