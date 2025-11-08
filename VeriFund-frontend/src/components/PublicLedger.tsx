import { useState, useEffect } from "react";
import { ethers, type EventLog } from "ethers";
import { contract, CONTRACT_ADDRESS } from "../web3-config";

interface EventEntry {
  id: string;
  type: "DONATION" | "SPEND";
  message: string;
  timestamp: number;
  blockNumber: number;
  txHash: string;
}

export const PublicLedger: React.FC = () => {
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [balance, setBalance] = useState<string>("0");
  const [admin, setAdmin] = useState<string>("");
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);

  useEffect(() => {
    const getContractData = async () => {
      try {
        console.log("Fetching contract data...");

        // Get contract balance
        const contractBalance: bigint = await contract.getBalance();
        setBalance(ethers.formatEther(contractBalance));

        // Get charity admin address
        const charityAdmin: string = await contract.charityAddress();
        setAdmin(charityAdmin);
      } catch (error) {
        console.error("Error fetching contract data:", error);
      }
    };

    const fetchHistoricalEvents = async () => {
      try {
        console.log("Fetching historical events...");
        setIsLoadingHistory(true);

        // Fetch all DonationReceived events
        const donationFilter = contract.filters.DonationReceived();
        const donationEvents = await contract.queryFilter(donationFilter);

        // Fetch all ReimbursementPaid events
        const reimbursementFilter = contract.filters.ReimbursementPaid();
        const reimbursementEvents = await contract.queryFilter(reimbursementFilter);

        // Convert to EventEntry format
        const historicalEvents: EventEntry[] = [];

        // Process donations
        for (const event of donationEvents) {
          // Type guard to check if event is EventLog
          if ('args' in event && event.args) {
            const [donor, amount] = event.args;
            historicalEvents.push({
              id: `${event.blockNumber}-${event.transactionHash}`,
              type: "DONATION",
              message: `${ethers.formatEther(amount)} ETH from ${donor.slice(0, 6)}...${donor.slice(-4)}`,
              timestamp: Date.now(), // We'll update this with block timestamp if needed
              blockNumber: event.blockNumber,
              txHash: event.transactionHash,
            });
          }
        }

        // Process reimbursements
        for (const event of reimbursementEvents) {
          // Type guard to check if event is EventLog
          if ('args' in event && event.args) {
            const [amount, invoiceData] = event.args;
            historicalEvents.push({
              id: `${event.blockNumber}-${event.transactionHash}`,
              type: "SPEND",
              message: `${ethers.formatEther(amount)} ETH - ${invoiceData}`,
              timestamp: Date.now(),
              blockNumber: event.blockNumber,
              txHash: event.transactionHash,
            });
          }
        }

        // Sort by block number (most recent first)
        historicalEvents.sort((a, b) => b.blockNumber - a.blockNumber);

        setEvents(historicalEvents);
        console.log(`Loaded ${historicalEvents.length} historical events`);
      } catch (error) {
        console.error("Error fetching historical events:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    const setupEventListeners = () => {
      console.log("Setting up live event listeners...");

      // Listen for NEW DonationReceived events
      contract.on(
        "DonationReceived",
        (donor: string, amount: bigint, event: EventLog) => {
          console.log("LIVE EVENT! DonationReceived:", { donor, amount, event });

          const entry: EventEntry = {
            id: `${event.blockNumber}-${event.transactionHash}`,
            type: "DONATION",
            message: `${ethers.formatEther(amount)} ETH from ${donor.slice(0, 6)}...${donor.slice(-4)}`,
            timestamp: Date.now(),
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
          };

          // Add to beginning of list if not already present
          setEvents((prevEvents) => {
            const exists = prevEvents.some((e) => e.id === entry.id);
            if (exists) return prevEvents;
            return [entry, ...prevEvents];
          });

          // Refresh balance after donation
          getContractData();
        }
      );

      // Listen for NEW ReimbursementPaid events
      contract.on(
        "ReimbursementPaid",
        (amount: bigint, invoiceData: string, event: EventLog) => {
          console.log("LIVE EVENT! ReimbursementPaid:", { amount, invoiceData, event });

          const entry: EventEntry = {
            id: `${event.blockNumber}-${event.transactionHash}`,
            type: "SPEND",
            message: `${ethers.formatEther(amount)} ETH - ${invoiceData}`,
            timestamp: Date.now(),
            blockNumber: event.blockNumber,
            txHash: event.transactionHash,
          };

          // Add to beginning of list if not already present
          setEvents((prevEvents) => {
            const exists = prevEvents.some((e) => e.id === entry.id);
            if (exists) return prevEvents;
            return [entry, ...prevEvents];
          });

          // Refresh balance after reimbursement
          getContractData();
        }
      );
    };

    // Initialize
    getContractData();
    fetchHistoricalEvents();
    setupEventListeners();

    // Cleanup listeners
    return () => {
      contract.removeAllListeners();
    };
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        CharityVault Public Ledger
      </h2>

      {/* Contract Info */}
      <div className="mb-6 space-y-2">
        <div className="text-sm">
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            Contract Address:
          </span>
          <code className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
            {CONTRACT_ADDRESS}
          </code>
        </div>
        <div className="text-sm">
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            Vault Admin:
          </span>
          <code className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
            {admin || "Loading..."}
          </code>
        </div>
      </div>

      {/* Current Balance */}
      <div className="mb-6 bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Current Vault Balance
        </h3>
        <p className="text-3xl font-bold text-blue-600 dark:text-blue-300">
          {balance} ETH
        </p>
      </div>

      {/* Event Log */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
          Transaction History ({events.length} total)
        </h3>
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto">
          {isLoadingHistory ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              Loading transaction history...
            </p>
          ) : events.length > 0 ? (
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`p-3 rounded ${
                    event.type === "DONATION"
                      ? "bg-green-100 dark:bg-green-900 border-l-4 border-green-500"
                      : "bg-red-100 dark:bg-red-900 border-l-4 border-red-500"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold ${
                        event.type === "DONATION"
                          ? "text-green-700 dark:text-green-300"
                          : "text-red-700 dark:text-red-300"
                      }`}
                    >
                      {event.type}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Block #{event.blockNumber}
                    </span>
                  </div>
                  <p
                    className={`text-sm ${
                      event.type === "DONATION"
                        ? "text-green-900 dark:text-green-100"
                        : "text-red-900 dark:text-red-100"
                    }`}
                  >
                    {event.message}
                  </p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${event.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-xs hover:underline mt-1 inline-block ${
                      event.type === "DONATION"
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    View on Etherscan →
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No transactions yet. Be the first to donate!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
