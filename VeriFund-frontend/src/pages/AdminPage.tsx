import { Link } from "react-router-dom";
import { AdminWrapper } from "../components/AdminWrapper";
import { PublicLedger } from "../components/PublicLedger";

export const AdminPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4"
          >
            ← Back to Public Portal
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            VeriFund Admin
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Charity administrator dashboard
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Admin Controls */}
          <div>
            <AdminWrapper />
          </div>

          {/* Right Column: Public Ledger */}
          <div>
            <PublicLedger />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            All reimbursement requests are transparently recorded on the
            blockchain
          </p>
          <p className="mt-1">Network: Sepolia Testnet</p>
        </div>
      </div>
    </div>
  );
};
