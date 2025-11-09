import { useState, useEffect } from "react";
import { ethers, type EventLog } from "ethers";
import { contract, CONTRACT_ADDRESS } from "../web3-config";

interface EventEntry {
  id: string;
  type: "DONATION" | "SPEND";
  message: string;
  timestamp: number; // Actual block timestamp
  blockNumber: number;
  txHash: string;
  donor?: string; // For donations
}

interface EventCache {
  events: EventEntry[];
  lastScannedBlock: number;
  lastUpdated: number;
}

// Cache management
const CACHE_KEY = "verifund_events_cache";
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const saveToCache = (events: EventEntry[], lastBlock: number) => {
  try {
    const cache: EventCache = {
      events,
      lastScannedBlock: lastBlock,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    console.log(`💾 Cached ${events.length} events (last block: ${lastBlock})`);
  } catch (error) {
    console.warn("Failed to save cache:", error);
  }
};

const loadFromCache = (): EventCache | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const cache: EventCache = JSON.parse(cached);
    const age = Date.now() - cache.lastUpdated;

    if (age > CACHE_MAX_AGE) {
      console.log("⚠️ Cache expired (older than 7 days)");
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    console.log(`📦 Loaded ${cache.events.length} cached events (last block: ${cache.lastScannedBlock})`);
    return cache;
  } catch (error) {
    console.warn("Failed to load cache:", error);
    return null;
  }
};

const clearCache = () => {
  localStorage.removeItem(CACHE_KEY);
  console.log("🗑️ Cache cleared");
};

export const PublicLedger: React.FC = () => {
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [balance, setBalance] = useState<string>("0");
  const [admin, setAdmin] = useState<string>("");
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [loadingProgress, setLoadingProgress] = useState<string>("");

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
        console.log("🔄 Fetching historical events...");
        console.log("📍 Contract address:", CONTRACT_ADDRESS);
        setIsLoadingHistory(true);
        setLoadError("");
        setLoadingProgress("Loading cache...");

        // Load cached events first
        const cache = loadFromCache();
        if (cache) {
          setEvents(cache.events);
          console.log(`✅ Loaded ${cache.events.length} events from cache`);
        }

        // Get current block
        const currentBlock = await contract.runner?.provider?.getBlockNumber();
        if (!currentBlock) throw new Error("Failed to get current block");
        console.log("📦 Current block:", currentBlock);

        // Determine what blocks to scan
        let startBlock: number;

        if (cache && cache.lastScannedBlock > 0) {
          // Incremental update: only scan NEW blocks since last cache
          startBlock = cache.lastScannedBlock + 1;
          console.log(`🔄 Incremental scan: blocks ${startBlock} to ${currentBlock}`);
        } else {
          // Full scan: scan last 500 blocks (Alchemy free tier friendly)
          const BLOCKS_TO_SCAN = 500;
          startBlock = Math.max(0, currentBlock - BLOCKS_TO_SCAN);
          console.log(`📊 Full scan: blocks ${startBlock} to ${currentBlock}`);
          console.log(`⚠️ Alchemy free tier: scanning last ${BLOCKS_TO_SCAN} blocks only`);
        }

        // Skip if already up to date
        if (startBlock > currentBlock) {
          console.log("✅ Already up to date!");
          setIsLoadingHistory(false);
          setLoadingProgress("");
          return;
        }

        // Chunk size - Alchemy free tier requires 10 blocks or less (inclusive)
        // Using 9 to be safe (fromBlock to toBlock inclusive = 10 blocks)
        const CHUNK_SIZE = 9;
        const totalBlocks = currentBlock - startBlock;
        const numChunks = Math.ceil(totalBlocks / CHUNK_SIZE);

        console.log(`📦 Will fetch in ${numChunks} chunks of ${CHUNK_SIZE} blocks each`);
        console.log(`⏱️ Estimated time: ~${Math.ceil(numChunks * 0.1)} seconds`);

        const donationFilter = contract.filters.DonationReceived();
        const reimbursementFilter = contract.filters.ReimbursementPaid();

        let allDonationEvents: any[] = [];
        let allReimbursementEvents: any[] = [];

        // Fetch events in chunks with rate limiting
        for (let i = 0; i < numChunks; i++) {
          const chunkStart = startBlock + (i * CHUNK_SIZE);
          const chunkEnd = Math.min(chunkStart + CHUNK_SIZE - 1, currentBlock);

          setLoadingProgress(`Scanning blocks ${chunkStart.toLocaleString()} - ${chunkEnd.toLocaleString()} (${i + 1}/${numChunks})`);
          console.log(`📥 Chunk ${i + 1}/${numChunks}: Blocks ${chunkStart} - ${chunkEnd}`);

          try {
            // Fetch donations for this chunk
            const chunkDonations = await contract.queryFilter(donationFilter, chunkStart, chunkEnd);
            allDonationEvents = [...allDonationEvents, ...chunkDonations];

            // Fetch reimbursements for this chunk
            const chunkReimbursements = await contract.queryFilter(reimbursementFilter, chunkStart, chunkEnd);
            allReimbursementEvents = [...allReimbursementEvents, ...chunkReimbursements];

            console.log(`  ✅ Chunk ${i + 1}: Found ${chunkDonations.length} donations, ${chunkReimbursements.length} reimbursements`);

            // Delay between chunks to avoid Alchemy rate limiting (100ms)
            if (i < numChunks - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (chunkError) {
            console.warn(`⚠️ Error fetching chunk ${i + 1}:`, chunkError);
            // Continue with other chunks even if one fails
          }
        }

        console.log(`✅ Total found: ${allDonationEvents.length} donations, ${allReimbursementEvents.length} reimbursements`);

        setLoadingProgress("Fetching block timestamps...");

        // Get unique block numbers to fetch timestamps
        const allEvents = [...allDonationEvents, ...allReimbursementEvents];
        const blockNumbers = [...new Set(allEvents.map(e => e.blockNumber))];
        console.log(`⏰ Fetching timestamps for ${blockNumbers.length} unique blocks...`);

        // Fetch block timestamps
        const blockTimestamps = new Map<number, number>();
        for (const blockNum of blockNumbers) {
          try {
            const block = await contract.runner?.provider?.getBlock(blockNum);
            if (block) {
              blockTimestamps.set(blockNum, block.timestamp);
            }
          } catch (err) {
            console.warn(`Failed to fetch block ${blockNum}:`, err);
          }
        }

        setLoadingProgress("Processing events...");

        // Convert to EventEntry format
        const historicalEvents: EventEntry[] = [];

        // Process donations
        for (const event of allDonationEvents) {
          if ('args' in event && event.args) {
            const [donor, amount] = event.args;
            const timestamp = blockTimestamps.get(event.blockNumber) || Math.floor(Date.now() / 1000);

            historicalEvents.push({
              id: `${event.blockNumber}-${event.transactionHash}`,
              type: "DONATION",
              message: `${ethers.formatEther(amount)} ETH from ${donor.slice(0, 6)}...${donor.slice(-4)}`,
              timestamp: timestamp * 1000,
              blockNumber: event.blockNumber,
              txHash: event.transactionHash,
              donor,
            });
          }
        }

        // Process reimbursements
        for (const event of allReimbursementEvents) {
          if ('args' in event && event.args) {
            const [amount, invoiceData] = event.args;
            const timestamp = blockTimestamps.get(event.blockNumber) || Math.floor(Date.now() / 1000);

            historicalEvents.push({
              id: `${event.blockNumber}-${event.transactionHash}`,
              type: "SPEND",
              message: `${ethers.formatEther(amount)} ETH - ${invoiceData}`,
              timestamp: timestamp * 1000,
              blockNumber: event.blockNumber,
              txHash: event.transactionHash,
            });
          }
        }

        // Merge with cached events (avoid duplicates)
        let finalEvents: EventEntry[];
        if (cache) {
          // Combine new events with cached events
          const cachedEventIds = new Set(cache.events.map(e => e.id));
          const newEvents = historicalEvents.filter(e => !cachedEventIds.has(e.id));
          finalEvents = [...cache.events, ...newEvents];
          console.log(`📊 Found ${newEvents.length} new events, ${cache.events.length} from cache`);
        } else {
          finalEvents = historicalEvents;
        }

        // Sort by block number (most recent first)
        finalEvents.sort((a, b) => b.blockNumber - a.blockNumber);

        setEvents(finalEvents);
        setLastRefresh(new Date());
        setLoadingProgress("");

        // Save to cache
        saveToCache(finalEvents, currentBlock);

        console.log(`✅ Successfully loaded ${finalEvents.length} total events`);
        console.log("📊 Events breakdown:", {
          donations: finalEvents.filter(e => e.type === "DONATION").length,
          reimbursements: finalEvents.filter(e => e.type === "SPEND").length,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("❌ Error fetching historical events:", error);
        setLoadError(`Failed to load transaction history: ${errorMsg}`);
        setLoadingProgress("");
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
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Transaction History ({events.length} total)
            </h3>
            {lastRefresh && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                clearCache();
                setEvents([]);
                setLastRefresh(new Date());
                console.log("🔄 Cache cleared, reloading...");
                window.location.reload();
              }}
              className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
              title="Clear cached events and reload from blockchain"
            >
              🗑️ Clear Cache
            </button>
            <button
              onClick={() => {
                console.log("🔄 Manual refresh triggered");
                const getContractData = async () => {
                try {
                  const contractBalance: bigint = await contract.getBalance();
                  setBalance(ethers.formatEther(contractBalance));
                  const charityAdmin: string = await contract.charityAddress();
                  setAdmin(charityAdmin);
                } catch (error) {
                  console.error("Error fetching contract data:", error);
                }
              };

              const fetchHistoricalEvents = async () => {
                try {
                  console.log("🔄 Refreshing historical events...");
                  setIsLoadingHistory(true);
                  setLoadError("");
                  setLoadingProgress("Loading cache...");

                  // Load cached events
                  const cache = loadFromCache();
                  if (cache) {
                    setEvents(cache.events);
                  }

                  const currentBlock = await contract.runner?.provider?.getBlockNumber();
                  if (!currentBlock) throw new Error("Failed to get current block");

                  // Incremental update if we have cache
                  let startBlock: number;
                  if (cache && cache.lastScannedBlock > 0) {
                    startBlock = cache.lastScannedBlock + 1;
                    console.log(`🔄 Incremental refresh from block ${startBlock}`);
                  } else {
                    const BLOCKS_TO_SCAN = 500;
                    startBlock = Math.max(0, currentBlock - BLOCKS_TO_SCAN);
                    console.log(`📊 Full refresh: last ${BLOCKS_TO_SCAN} blocks`);
                  }

                  if (startBlock > currentBlock) {
                    console.log("✅ Already up to date!");
                    setIsLoadingHistory(false);
                    setLoadingProgress("");
                    return;
                  }

                  const CHUNK_SIZE = 9; // Alchemy free tier limit (10 blocks inclusive)
                  const totalBlocks = currentBlock - startBlock;
                  const numChunks = Math.ceil(totalBlocks / CHUNK_SIZE);

                  console.log(`🔄 Refresh: Scanning ${totalBlocks} blocks in ${numChunks} chunks`);

                  const donationFilter = contract.filters.DonationReceived();
                  const reimbursementFilter = contract.filters.ReimbursementPaid();

                  let allDonationEvents: any[] = [];
                  let allReimbursementEvents: any[] = [];

                  for (let i = 0; i < numChunks; i++) {
                    const chunkStart = startBlock + (i * CHUNK_SIZE);
                    const chunkEnd = Math.min(chunkStart + CHUNK_SIZE - 1, currentBlock);
                    setLoadingProgress(`Scanning ${i + 1}/${numChunks}`);

                    try {
                      const chunkDonations = await contract.queryFilter(donationFilter, chunkStart, chunkEnd);
                      allDonationEvents = [...allDonationEvents, ...chunkDonations];
                      const chunkReimbursements = await contract.queryFilter(reimbursementFilter, chunkStart, chunkEnd);
                      allReimbursementEvents = [...allReimbursementEvents, ...chunkReimbursements];

                      // Delay to avoid Alchemy rate limiting (100ms)
                      if (i < numChunks - 1) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                      }
                    } catch (chunkError) {
                      console.warn(`⚠️ Error fetching chunk ${i + 1}:`, chunkError);
                    }
                  }

                  setLoadingProgress("Fetching timestamps...");
                  const allEvents = [...allDonationEvents, ...allReimbursementEvents];
                  const blockNumbers = [...new Set(allEvents.map(e => e.blockNumber))];

                  const blockTimestamps = new Map<number, number>();
                  for (const blockNum of blockNumbers) {
                    try {
                      const block = await contract.runner?.provider?.getBlock(blockNum);
                      if (block) blockTimestamps.set(blockNum, block.timestamp);
                    } catch (err) {
                      console.warn(`Failed to fetch block ${blockNum}:`, err);
                    }
                  }

                  const historicalEvents: EventEntry[] = [];

                  for (const event of allDonationEvents) {
                    if ('args' in event && event.args) {
                      const [donor, amount] = event.args;
                      const timestamp = blockTimestamps.get(event.blockNumber) || Math.floor(Date.now() / 1000);
                      historicalEvents.push({
                        id: `${event.blockNumber}-${event.transactionHash}`,
                        type: "DONATION",
                        message: `${ethers.formatEther(amount)} ETH from ${donor.slice(0, 6)}...${donor.slice(-4)}`,
                        timestamp: timestamp * 1000,
                        blockNumber: event.blockNumber,
                        txHash: event.transactionHash,
                        donor,
                      });
                    }
                  }

                  for (const event of allReimbursementEvents) {
                    if ('args' in event && event.args) {
                      const [amount, invoiceData] = event.args;
                      const timestamp = blockTimestamps.get(event.blockNumber) || Math.floor(Date.now() / 1000);
                      historicalEvents.push({
                        id: `${event.blockNumber}-${event.transactionHash}`,
                        type: "SPEND",
                        message: `${ethers.formatEther(amount)} ETH - ${invoiceData}`,
                        timestamp: timestamp * 1000,
                        blockNumber: event.blockNumber,
                        txHash: event.transactionHash,
                      });
                    }
                  }

                  // Merge with cached events
                  let finalEvents: EventEntry[];
                  if (cache) {
                    const cachedEventIds = new Set(cache.events.map(e => e.id));
                    const newEvents = historicalEvents.filter(e => !cachedEventIds.has(e.id));
                    finalEvents = [...cache.events, ...newEvents];
                    console.log(`📊 Found ${newEvents.length} new events`);
                  } else {
                    finalEvents = historicalEvents;
                  }

                  finalEvents.sort((a, b) => b.blockNumber - a.blockNumber);
                  setEvents(finalEvents);
                  setLastRefresh(new Date());
                  setLoadingProgress("");

                  // Save to cache
                  saveToCache(finalEvents, currentBlock);

                  console.log(`✅ Refreshed: ${finalEvents.length} total events loaded`);
                } catch (error) {
                  const errorMsg = error instanceof Error ? error.message : String(error);
                  console.error("❌ Error refreshing:", error);
                  setLoadError(`Failed to refresh: ${errorMsg}`);
                  setLoadingProgress("");
                } finally {
                  setIsLoadingHistory(false);
                }
              };

              getContractData();
              fetchHistoricalEvents();
            }}
              disabled={isLoadingHistory}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition-colors disabled:cursor-not-allowed"
            >
              {isLoadingHistory ? "Refreshing..." : "🔄 Refresh"}
            </button>
          </div>
        </div>

        {loadError && (
          <div className="mb-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-200 font-semibold mb-1">
              Error Loading History
            </p>
            <p className="text-xs text-red-700 dark:text-red-300">
              {loadError}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              Check the browser console for details.
            </p>
          </div>
        )}

        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto">
          {isLoadingHistory ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                Loading transaction history...
              </p>
              {loadingProgress && (
                <p className="text-sm text-blue-600 dark:text-blue-400 font-mono mb-2">
                  {loadingProgress}
                </p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Fetching events in chunks to work with free RPC tier limits
              </p>
            </div>
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
                    <div className="text-right">
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {new Date(event.timestamp).toLocaleDateString()} {new Date(event.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        Block #{event.blockNumber}
                      </div>
                    </div>
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
