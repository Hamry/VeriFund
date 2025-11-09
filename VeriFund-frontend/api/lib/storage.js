/**
 * Simple JSON file storage for VeriFund
 *
 * IMPORTANT: This is a simplified storage solution for development.
 * For production, use a proper database (PostgreSQL, MongoDB, etc.)
 *
 * Data is stored in local 'data' directory (persistent across restarts)
 */

import fs from 'fs';
import path from 'path';

// Storage directory - use local 'data' directory for Express server
const STORAGE_DIR = path.join(process.cwd(), 'data');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

/**
 * @typedef {Object} User
 * @property {string} email
 * @property {string} walletAddress
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Donation
 * @property {string} id
 * @property {string} email
 * @property {string} walletAddress
 * @property {string} amount - in ETH
 * @property {string} txHash
 * @property {number} blockNumber
 * @property {string} timestamp
 * @property {string} remaining - Amount not yet "spent" by reimbursements (for FIFO)
 */

/**
 * @typedef {Object} Reimbursement
 * @property {string} id
 * @property {string} amount - in ETH
 * @property {string} txHash
 * @property {number} blockNumber
 * @property {string} timestamp
 * @property {string} invoiceData
 */

/**
 * @typedef {Object} FIFONotification
 * @property {string} email
 * @property {string} walletAddress
 * @property {string} amountSpent
 * @property {string} donationId
 * @property {string} originalAmount
 * @property {number} percentageSpent
 */

// Get file path for a storage collection
function getFilePath(collection) {
  return path.join(STORAGE_DIR, `${collection}.json`);
}

// Read data from a collection
function readCollection(collection) {
  const filePath = getFilePath(collection);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${collection}:`, error);
    return [];
  }
}

// Write data to a collection
function writeCollection(collection, data) {
  const filePath = getFilePath(collection);

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing ${collection}:`, error);
    throw error;
  }
}

// ============= USERS =============

export function getUsers() {
  return readCollection('users');
}

export function getUserByEmail(email) {
  const users = getUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export function getUserByWallet(walletAddress) {
  const users = getUsers();
  return users.find(u => u.walletAddress.toLowerCase() === walletAddress.toLowerCase());
}

export function createOrUpdateUser(email, walletAddress) {
  const users = getUsers();
  const existingIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

  const user = {
    email,
    walletAddress,
    createdAt: existingIndex >= 0 ? users[existingIndex].createdAt : new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }

  writeCollection('users', users);
  return user;
}

// ============= DONATIONS =============

export function getDonations() {
  return readCollection('donations');
}

export function getDonationsByEmail(email) {
  const donations = getDonations();
  return donations.filter(d => d.email.toLowerCase() === email.toLowerCase());
}

export function createDonation(email, walletAddress, amount, txHash, blockNumber) {
  const donations = getDonations();

  const donation = {
    id: `${txHash}-${blockNumber}`,
    email,
    walletAddress,
    amount,
    txHash,
    blockNumber,
    timestamp: new Date().toISOString(),
    remaining: amount, // Initially, full amount is remaining
  };

  donations.push(donation);
  writeCollection('donations', donations);

  return donation;
}

export function updateDonationRemaining(donationId, remaining) {
  const donations = getDonations();
  const index = donations.findIndex(d => d.id === donationId);

  if (index >= 0) {
    donations[index].remaining = remaining;
    writeCollection('donations', donations);
  }
}

// ============= REIMBURSEMENTS =============

export function getReimbursements() {
  return readCollection('reimbursements');
}

export function createReimbursement(amount, txHash, blockNumber, invoiceData) {
  const reimbursements = getReimbursements();

  const reimbursement = {
    id: `${txHash}-${blockNumber}`,
    amount,
    txHash,
    blockNumber,
    timestamp: new Date().toISOString(),
    invoiceData,
  };

  reimbursements.push(reimbursement);
  writeCollection('reimbursements', reimbursements);

  return reimbursement;
}

// ============= FIFO CALCULATIONS =============

/**
 * Calculate FIFO notifications for a reimbursement
 * Returns which donors should be notified and how much of their donation was spent
 * @param {string} reimbursementAmount
 * @returns {FIFONotification[]}
 */
export function calculateFIFONotifications(reimbursementAmount) {
  const donations = getDonations();

  // Sort by timestamp (oldest first) for FIFO
  const sortedDonations = [...donations].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let remainingReimbursement = parseFloat(reimbursementAmount);
  const notifications = [];

  for (const donation of sortedDonations) {
    const donationRemaining = parseFloat(donation.remaining);

    if (donationRemaining <= 0) {
      continue; // Skip fully spent donations
    }

    if (remainingReimbursement <= 0) {
      break; // We've allocated all the reimbursement
    }

    // How much of this donation will be spent?
    const amountFromThisDonation = Math.min(donationRemaining, remainingReimbursement);

    notifications.push({
      email: donation.email,
      walletAddress: donation.walletAddress,
      amountSpent: amountFromThisDonation.toString(),
      donationId: donation.id,
      originalAmount: donation.amount,
      percentageSpent: (amountFromThisDonation / parseFloat(donation.amount)) * 100,
    });

    remainingReimbursement -= amountFromThisDonation;
  }

  return notifications;
}

/**
 * Process a reimbursement and update donation remaining amounts
 * @param {string} reimbursementAmount
 * @returns {FIFONotification[]}
 */
export function processReimbursement(reimbursementAmount) {
  const notifications = calculateFIFONotifications(reimbursementAmount);

  // Update the remaining amounts for affected donations
  for (const notification of notifications) {
    const donations = getDonations();
    const donation = donations.find(d => d.id === notification.donationId);

    if (donation) {
      const newRemaining = parseFloat(donation.remaining) - parseFloat(notification.amountSpent);
      updateDonationRemaining(donation.id, newRemaining.toString());
    }
  }

  return notifications;
}
