import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { ethers, type Signer } from "ethers";
import {
  useCurrentUser,
  useEvmAddress,
  useSendEvmTransaction,
  useSignOut
} from "@coinbase/cdp-hooks";

// User state machine: LOGGED_OUT -> LOGGED_IN -> FUNDED
export type UserStatus = "LOGGED_OUT" | "LOGGED_IN" | "FUNDED";

export interface WalletContextType {
  // User state
  userStatus: UserStatus;
  userEmail: string | null;
  userAddress: string | null; // EVM address from Coinbase wallet
  userBalance: string;

  // Coinbase transaction function (replaces embeddedSigner)
  sendTransaction: ((options: any) => Promise<any>) | null;

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
  // Coinbase CDP hooks - these automatically sync with the embedded wallet
  const { currentUser } = useCurrentUser();
  const { evmAddress } = useEvmAddress();
  const { sendEvmTransaction } = useSendEvmTransaction();
  const { signOut } = useSignOut();

  // Donor state
  const [userStatus, setUserStatus] = useState<UserStatus>("LOGGED_OUT");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string>("0");

  // Admin state
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminSigner, setAdminSigner] = useState<Signer | null>(null);

  // Sync Coinbase user state to our local state
  useEffect(() => {
    const syncUserState = async () => {
      if (currentUser && evmAddress) {
        // User is logged in via Coinbase embedded wallet
        // @ts-ignore - Coinbase CDP types may vary
        const email = currentUser.email || currentUser.emailAddress || null;
        setUserEmail(email);
        setUserStatus("LOGGED_IN");

        // Register user in backend (email-wallet mapping)
        if (email) {
          try {
            const response = await fetch('/api/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email,
                walletAddress: evmAddress,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              console.log('User registered in backend:', data.user);
            } else {
              console.error('Failed to register user in backend');
            }
          } catch (error) {
            console.error('Error registering user:', error);
          }
        }

        // Check balance to determine if funded
        await refreshBalance();
      } else {
        // User is logged out
        setUserStatus("LOGGED_OUT");
        setUserEmail(null);
        setUserBalance("0");
      }
    };

    syncUserState();
  }, [currentUser, evmAddress]);

  // Login with email - Coinbase handles the magic link authentication
  const loginWithEmail = async (email: string) => {
    try {
      console.log("Login requested for:", email);

      // Coinbase CDP will handle the login flow via magic link
      // The useCurrentUser hook will automatically update when login completes
      // This function is mainly here for UI flow - actual auth happens in components
      // that use the Coinbase login components

      console.log("Coinbase embedded wallet login initiated");
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      // Logout from Coinbase embedded wallet
      await signOut();

      setUserStatus("LOGGED_OUT");
      setUserEmail(null);
      setUserBalance("0");
      console.log("User logged out");
    } catch (error) {
      console.error("Logout failed:", error);
    }
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
    if (!evmAddress) return;

    try {
      // Get balance from blockchain using the RPC URL from env
      const rpcUrl = import.meta.env.VITE_RPC_URL;
      if (!rpcUrl) {
        console.error("RPC URL not configured");
        return;
      }

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const balance = await provider.getBalance(evmAddress);
      const balanceInEth = ethers.formatEther(balance);
      setUserBalance(balanceInEth);

      // Update status based on balance
      const balanceNum = parseFloat(balanceInEth);
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
    userAddress: evmAddress,
    userBalance,
    sendTransaction: sendEvmTransaction,
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
