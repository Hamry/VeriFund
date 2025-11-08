import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { ethers, type Signer } from "ethers";

// User state machine: LOGGED_OUT -> LOGGED_IN -> FUNDED
export type UserStatus = "LOGGED_OUT" | "LOGGED_IN" | "FUNDED";

export interface WalletContextType {
  // User state
  userStatus: UserStatus;
  userEmail: string | null;
  userAddress: string | null;
  userBalance: string;

  // Embedded wallet signer (for donors)
  embeddedSigner: Signer | null;

  // Admin MetaMask state
  isAdmin: boolean;
  adminSigner: Signer | null;

  // Actions
  loginWithEmail: (email: string) => Promise<void>;
  logout: () => void;
  connectMetaMask: () => Promise<void>;
  disconnectMetaMask: () => void;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  // Donor state
  const [userStatus, setUserStatus] = useState<UserStatus>("LOGGED_OUT");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string>("0");
  const [embeddedSigner, setEmbeddedSigner] = useState<Signer | null>(null);

  // Admin state
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminSigner, setAdminSigner] = useState<Signer | null>(null);

  // Login with email (placeholder - will integrate Coinbase Embedded Wallet SDK)
  const loginWithEmail = async (email: string) => {
    try {
      console.log("Login requested for:", email);

      // TODO: Integrate Coinbase Embedded Wallet SDK
      // For now, this is a placeholder that simulates the flow
      setUserEmail(email);

      // Simulate wallet creation/retrieval
      // In production: const signer = await embeddedWalletSDK.getSigner();
      const placeholderAddress = "0x0000000000000000000000000000000000000000";
      setUserAddress(placeholderAddress);
      setUserStatus("LOGGED_IN");

      console.log("TODO: Implement Coinbase Embedded Wallet SDK integration");
      console.log("User logged in (placeholder mode)");

      // After login, check balance
      await refreshBalance();
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  // Logout
  const logout = () => {
    setUserStatus("LOGGED_OUT");
    setUserEmail(null);
    setUserAddress(null);
    setUserBalance("0");
    setEmbeddedSigner(null);
    console.log("User logged out");
  };

  // Connect MetaMask (for admin)
  const connectMetaMask = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed");
      }

      // Request account access
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setAdminSigner(signer);

      // TODO: Check if this address matches the charity admin address
      // For now, we'll assume any MetaMask connection could be admin
      setIsAdmin(true);

      console.log("MetaMask connected:", address);
    } catch (error) {
      console.error("MetaMask connection failed:", error);
      throw error;
    }
  };

  // Disconnect MetaMask
  const disconnectMetaMask = () => {
    setAdminSigner(null);
    setIsAdmin(false);
    console.log("MetaMask disconnected");
  };

  // Refresh user balance
  const refreshBalance = async () => {
    if (!userAddress) return;

    try {
      // TODO: Get balance from blockchain
      // For now, this is a placeholder
      // In production:
      // const provider = new ethers.JsonRpcProvider(RPC_URL);
      // const balance = await provider.getBalance(userAddress);
      // setUserBalance(ethers.formatEther(balance));

      setUserBalance("0.0");

      // Update status based on balance
      const balanceNum = parseFloat("0.0");
      if (balanceNum > 0 && userStatus === "LOGGED_IN") {
        setUserStatus("FUNDED");
      }
    } catch (error) {
      console.error("Failed to refresh balance:", error);
    }
  };

  // Listen for MetaMask account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectMetaMask();
        }
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      };
    }
  }, []);

  const value: WalletContextType = {
    userStatus,
    userEmail,
    userAddress,
    userBalance,
    embeddedSigner,
    isAdmin,
    adminSigner,
    loginWithEmail,
    logout,
    connectMetaMask,
    disconnectMetaMask,
    refreshBalance,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

// Custom hook to use the wallet context
export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
