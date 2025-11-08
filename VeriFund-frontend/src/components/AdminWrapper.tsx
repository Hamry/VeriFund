import { useState, useEffect } from "react";
import { useWallet } from "../contexts/WalletContext";
import { contract } from "../web3-config";
import { ReimbursementForm } from "./ReimbursementForm";

export const AdminWrapper: React.FC = () => {
  const { isAdmin, adminSigner, connectMetaMask, disconnectMetaMask } =
    useWallet();
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectedAddress, setConnectedAddress] = useState<string>("");
  const [charityAddress, setCharityAddress] = useState<string>("");
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  // Fetch the charity admin address from the contract
  useEffect(() => {
    const fetchCharityAddress = async () => {
      try {
        const addr: string = await contract.charityAddress();
        setCharityAddress(addr.toLowerCase());
        console.log("Charity admin address:", addr);
      } catch (error) {
        console.error("Failed to fetch charity address:", error);
      }
    };

    fetchCharityAddress();
  }, []);

  // Check if connected admin is authorized
  useEffect(() => {
    const checkAuthorization = async () => {
      if (adminSigner && charityAddress) {
        try {
          const addr = await adminSigner.getAddress();
          setConnectedAddress(addr);
          const isAuth = addr.toLowerCase() === charityAddress;
          setIsAuthorized(isAuth);
          console.log("Admin authorization:", isAuth);
        } catch (error) {
          console.error("Failed to get admin address:", error);
          setIsAuthorized(false);
        }
      } else {
        setIsAuthorized(false);
        setConnectedAddress("");
      }
    };

    checkAuthorization();
  }, [adminSigner, charityAddress]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connectMetaMask();
    } catch (error) {
      console.error("Connection failed:", error);
      alert(
        "Failed to connect MetaMask. Make sure MetaMask is installed and unlocked."
      );
    } finally {
      setIsConnecting(false);
    }
  };

  // Not connected - show connect button
  if (!isAdmin || !adminSigner) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Admin Portal
        </h2>

        <p className="text-gray-700 dark:text-gray-300 mb-6">
          This area is restricted to the charity administrator. Connect your
          MetaMask wallet to access admin functions.
        </p>

        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:cursor-not-allowed"
        >
          {isConnecting ? "Connecting..." : "Connect MetaMask"}
        </button>

        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <span className="font-semibold">Note:</span> You must be connected
            with the charity admin wallet to access this portal. The admin
            address is configured in the smart contract.
          </p>
        </div>
      </div>
    );
  }

  // Connected but not authorized
  if (!isAuthorized) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Access Denied
        </h2>

        <div className="mb-6">
          <p className="text-red-600 dark:text-red-400 font-semibold mb-4">
            The connected wallet is not authorized to access the admin portal.
          </p>

          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                Connected Wallet:
              </span>
              <code className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
                {connectedAddress}
              </code>
            </div>
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                Required Admin Wallet:
              </span>
              <code className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
                {charityAddress}
              </code>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={disconnectMetaMask}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
          >
            Disconnect
          </button>
          <button
            onClick={handleConnect}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
          >
            Switch Account
          </button>
        </div>
      </div>
    );
  }

  // Connected and authorized - show admin portal
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connected as Admin:
            </p>
            <code className="text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded text-green-800 dark:text-green-200">
              {connectedAddress}
            </code>
          </div>
          <button
            onClick={disconnectMetaMask}
            className="text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            Disconnect
          </button>
        </div>
      </div>

      <ReimbursementForm />

      <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <span className="font-semibold">Admin capabilities:</span>
        </p>
        <ul className="text-sm text-blue-900 dark:text-blue-100 mt-2 ml-4 list-disc space-y-1">
          <li>Request reimbursements from the charity vault</li>
          <li>Provide invoice data for transparency</li>
          <li>All transactions are recorded on the blockchain</li>
        </ul>
      </div>
    </div>
  );
};
