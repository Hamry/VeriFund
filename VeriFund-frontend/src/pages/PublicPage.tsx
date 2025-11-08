import { Link } from "react-router-dom";
import { DonationFlow } from "../components/DonationFlow";
import { PublicLedger } from "../components/PublicLedger";

export const PublicPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            VeriFund
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Transparent blockchain-based charity donations
          </p>
          <Link
            to="/admin"
            className="inline-block mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Admin Portal →
          </Link>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Donation Flow */}
          <div>
            <DonationFlow />
          </div>

          {/* Right Column: Public Ledger */}
          <div>
            <PublicLedger />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            All donations and reimbursements are recorded on the Ethereum
            blockchain
          </p>
          <p className="mt-1">Network: Sepolia Testnet</p>
        </div>
      </div>
    </div>
  );
};
