import { ethers } from "ethers";

// 1. YOUR LIVE CONTRACT ADDRESS
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as string;

// 2. YOUR CONTRACT'S ABI
// We use "as const" to make the ABI read-only and help TypeScript
export const CONTRACT_ABI = [
  {
    inputs: [],
    name: "donate",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "donor",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "DonationReceived",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "string",
        name: "invoiceData",
        type: "string",
      },
    ],
    name: "ReimbursementPaid",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "invoiceData",
        type: "string",
      },
    ],
    name: "requestReimbursement",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "charityAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const; // This "as const" is important for TypeScript

// 3. A READ-ONLY PROVIDER
const RPC_URL = import.meta.env.VITE_RPC_URL as string;
const provider = new ethers.JsonRpcProvider(RPC_URL);

// 4. A READ-ONLY INSTANCE OF YOUR CONTRACT
export const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  provider
);
