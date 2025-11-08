/**
 * Simple JSON file storage for Vercel
 *
 * IMPORTANT: This is a simplified storage solution for development.
 * For production, use a proper database (PostgreSQL, MongoDB, etc.)
 *
 * Data is stored in /tmp directory on Vercel (ephemeral, resets on deployment)
 */

import fs from 'fs';
import path from 'path';

// Storage directory (use /tmp on Vercel, local directory in dev)
const STORAGE_DIR = process.env.VERCEL ? '/tmp/verifund-data' : path.join(process.cwd(), 'data');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export interface User {
  email: string;
  walletAddress: string;
  createdAt: string;
}

export interface Donation {
  id: string;
  email: string;
  walletAddress: string;
  amount: string; // in ETH
  txHash: string;
  blockNumber: number;
  timestamp: string;
  remaining: string; // Amount not yet "spent" by reimbursements (for FIFO)
}

export interface Reimbursement {
  id: string;
  amount: string; // in ETH
  txHash: string;
  blockNumber: number;
  timestamp: string;
  invoiceData: string;
}

// Get file path for a storage collection
function getFilePath(collection: 'users' | 'donations' | 'reimbursements'): string {
  return path.join(STORAGE_DIR, `${collection}.json`);
}

// Read data from a collection
function readCollection<T>(collection: 'users' | 'donations' | 'reimbursements'): T[] {
  const filePath = getFilePath(collection);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as T[];
  } catch (error) {
    console.error(`Error reading ${collection}:`, error);
    return [];
  }
}

// Write data to a collection
function writeCollection<T>(collection: 'users' | 'donations' | 'reimbursements', data: T[]): void {
  const filePath = getFilePath(collection);

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing ${collection}:`, error);
    throw error;
  }
}

// ============= USERS =============

export function getUsers(): User[] {
  return readCollection<User>('users');
}

export function getUserByEmail(email: string): User | undefined {
  const users = getUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export function getUserByWallet(walletAddress: string): User | undefined {
  const users = getUsers();
  return users.find(u => u.walletAddress.toLowerCase() === walletAddress.toLowerCase());
}

export function createOrUpdateUser(email: string, walletAddress: string): User {
  const users = getUsers();
  const existingIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

  const user: User = {
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

export function getDonations(): Donation[] {
  return readCollection<Donation>('donations');
}

export function getDonationsByEmail(email: string): Donation[] {
  const donations = getDonations();
  return donations.filter(d => d.email.toLowerCase() === email.toLowerCase());
}

export function createDonation(
  email: string,
  walletAddress: string,
  amount: string,
  txHash: string,
  blockNumber: number
): Donation {
  const donations = getDonations();

  const donation: Donation = {
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

export function updateDonationRemaining(donationId: string, remaining: string): void {
  const donations = getDonations();
  const index = donations.findIndex(d => d.id === donationId);

  if (index >= 0) {
    donations[index].remaining = remaining;
    writeCollection('donations', donations);
  }
}

// ============= REIMBURSEMENTS =============

export function getReimbursements(): Reimbursement[] {
  return readCollection<Reimbursement>('reimbursements');
}

export function createReimbursement(
  amount: string,
  txHash: string,
  blockNumber: number,
  invoiceData: string
): Reimbursement {
  const reimbursements = getReimbursements();

  const reimbursement: Reimbursement = {
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

export interface FIFONotification {
  email: string;
  walletAddress: string;
  amountSpent: string;
  donationId: string;
  originalAmount: string;
  percentageSpent: number;
}

/**
 * Calculate FIFO notifications for a reimbursement
 * Returns which donors should be notified and how much of their donation was spent
 */
export function calculateFIFONotifications(reimbursementAmount: string): FIFONotification[] {
  const donations = getDonations();

  // Sort by timestamp (oldest first) for FIFO
  const sortedDonations = [...donations].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let remainingReimbursement = parseFloat(reimbursementAmount);
  const notifications: FIFONotification[] = [];

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
 */
export function processReimbursement(reimbursementAmount: string): FIFONotification[] {
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
