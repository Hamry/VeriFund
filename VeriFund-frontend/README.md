# VeriFund Frontend

A blockchain-based charity donation platform built with React, TypeScript, and Ethereum smart contracts.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your values:
   ```
   VITE_CONTRACT_ADDRESS=your_contract_address
   VITE_RPC_URL=your_rpc_url
   VITE_COINBASE_WALLET_APP_ID=your_wallet_app_id (when ready)
   VITE_COINBASE_ONRAMP_APP_ID=your_onramp_app_id (when ready)
   ```

## Project Structure

```
src/
├── contexts/
│   └── WalletContext.tsx       # Global wallet state management
├── components/
│   ├── PublicLedger.tsx        # Live event log viewer
│   ├── DonationFlow.tsx        # Donor journey state machine
│   ├── FundWallet.tsx          # Credit card funding interface
│   ├── MakeDonation.tsx        # Donation transaction interface
│   ├── AdminWrapper.tsx        # Admin access control
│   └── ReimbursementForm.tsx   # Admin reimbursement requests
├── pages/
│   ├── PublicPage.tsx          # Public donation portal (/)
│   └── AdminPage.tsx           # Admin portal (/admin)
├── web3-config.tsx             # Smart contract configuration
└── App.tsx                     # Main routing component
```

## Features

### Public Portal (/)
- **Email Login**: Sign in to create/access embedded wallet (placeholder)
- **Fund Wallet**: Add funds via credit card using Coinbase Onramp (placeholder)
- **Make Donation**: Send ETH to charity vault
- **Live Ledger**: Real-time view of all donations and reimbursements

### Admin Portal (/admin)
- **MetaMask Connection**: Connect with charity admin wallet
- **Request Reimbursement**: Withdraw funds with invoice documentation
- **Access Control**: Only authorized charity address can access

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS v4** - Styling
- **React Router v7** - Routing
- **Ethers.js v6** - Ethereum interaction
- **Coinbase SDKs** - Embedded wallets & onramp (to be integrated)

## Current Status

### ✅ Implemented
- Full UI/UX for donation and admin flows
- MetaMask integration for admin
- Real-time blockchain event listening
- Transaction confirmation and tracking
- Environment variable configuration
- Type-safe contract interactions

### ⏳ Pending Integration
- Coinbase Embedded Wallet SDK
- Coinbase Onramp SDK
- Backend API for donor tracking

See `../Docs/implementation-summary.md` for detailed implementation notes and TODOs.

## Smart Contract

The frontend interacts with a CharityVault smart contract deployed on Sepolia testnet.

**Key Functions:**
- `donate()` - Receive donations
- `requestReimbursement(amount, invoiceData)` - Admin withdrawals
- `getBalance()` - View vault balance
- `charityAddress()` - View admin address

**Events:**
- `DonationReceived(donor, amount)`
- `ReimbursementPaid(amount, invoiceData)`

## Development Notes

### Adding Coinbase SDK Integration

When you have API keys, integrate the SDKs in these files:

1. **Embedded Wallet**: `src/contexts/WalletContext.tsx`
2. **Onramp**: `src/components/FundWallet.tsx`
3. **Donations**: `src/components/MakeDonation.tsx`

Look for `// TODO:` comments for specific integration points.

### Testing Locally

1. Run `npm run dev`
2. Visit `http://localhost:5173`
3. For admin testing:
   - Visit `http://localhost:5173/admin`
   - Connect MetaMask
   - Ensure you're on Sepolia testnet
   - Use the charity admin wallet address

## Common Issues

### MetaMask Not Detected
- Install [MetaMask](https://metamask.io) browser extension
- Ensure it's unlocked
- Switch to Sepolia testnet

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Check that `.env.local` exists and has valid values
- Clear node_modules and reinstall if issues persist

## License

MIT
