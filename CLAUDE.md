# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VeriFund is a blockchain-based charity donation platform with transparent fund tracking. It consists of:
- **Smart Contract**: Ethereum-based charity vault (deployed on Sepolia testnet at `0xfE5Fa780925aB6bC914fA763Fb73Cd07f49270d3`)
- **Frontend**: React + TypeScript + Vite application for donation tracking and admin management
- **Planned Architecture**: Embedded wallet system with fiat on-ramp for seamless donor experience

## Development Commands

### Frontend (VeriFund-frontend/)
```bash
cd VeriFund-frontend
npm install          # Install dependencies
npm run dev          # Start development server (Vite)
npm run build        # Build for production (TypeScript compile + Vite build)
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Root Directory
The root `package.json` only contains the `ethers` dependency, likely for backend scripts or contract interaction tooling.

## Architecture

### Smart Contract Integration
- **Contract Address**: Stored in `VeriFund-frontend/src/web3-config.tsx`
- **ABI**: Hardcoded in `web3-config.tsx` with the contract's interface
- **Provider**: Uses Alchemy JSON-RPC provider for Sepolia testnet (read-only)
- **Contract Instance**: Exported read-only contract instance for querying state and listening to events

**Key Smart Contract Functions**:
- `donate()`: Payable function for receiving donations
- `requestReimbursement(uint256 amount, string invoiceData)`: Admin function to withdraw funds
- `getBalance()`: View function returning vault balance
- `charityAddress()`: View function returning admin address

**Events Tracked**:
- `DonationReceived(address indexed donor, uint256 amount)`
- `ReimbursementPaid(uint256 amount, string invoiceData)`

### Frontend Architecture
- **Entry Point**: `src/main.tsx` renders the `App` component
- **Main Component**: `src/App.tsx` - Dashboard displaying:
  - Contract address
  - Vault admin address
  - Current vault balance
  - Live event log for donations and reimbursements
- **Web3 Config**: `src/web3-config.tsx` - Centralized blockchain connection configuration

**Current Implementation**:
The app is read-only, displaying contract state and listening to events in real-time. It does NOT yet implement write operations (donations or admin functions).

**Planned Architecture** (see `Docs/frontend.md`):
- **Public Portal**: Web2-style donation flow using Coinbase Embedded Wallets
  - Email authentication with magic links
  - Embedded wallet creation per user
  - Fiat on-ramp integration (credit card → ETH → donation)
  - User state machine: LOGGED_OUT → LOGGED_IN → FUNDED → DONATED
- **Admin Portal**: MetaMask-gated admin interface for reimbursements
- **Backend**: Vercel serverless functions for donor tracking (email ↔ wallet address mapping)

### TypeScript Configuration
- Uses project references (`tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`)
- `tsconfig.app.json`: Application code configuration
- `tsconfig.node.json`: Vite config and tooling configuration

### Blockchain Connection
**IMPORTANT**: The RPC URL in `web3-config.tsx` appears to be exposed (contains what looks like an API key). In production:
- Move RPC URLs to environment variables (`.env` files)
- Use Vite's `import.meta.env.VITE_*` pattern for environment variables
- Never commit API keys or RPC URLs to version control

## Key Implementation Notes

### Event Listening Pattern
The app uses ethers.js event listeners with explicit TypeScript typing:
```typescript
contract.on("EventName", (param1: type1, param2: type2, event: EventLog) => {
  // Handle event
});
```
Always clean up listeners in `useEffect` return functions to prevent memory leaks.

### State Management
Currently uses React `useState` for local component state. For the planned multi-step donation flow, consider:
- `useReducer` for complex state machines (LOGGED_OUT → LOGGED_IN → FUNDED)
- React Context to share wallet/auth state across components
- Separate signer management: Embedded Wallet signer (donors) vs MetaMask signer (admin)

### Contract Instance Pattern
When implementing write operations:
- Read-only operations: Use the exported `contract` from `web3-config.tsx`
- Write operations: Create a new contract instance with a signer:
  ```typescript
  const writableContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  ```

## Project Structure

```
VeriFund/
├── Docs/
│   └── frontend.md          # Detailed frontend architecture plan
├── VeriFund-frontend/       # React application
│   ├── src/
│   │   ├── App.tsx          # Main dashboard component
│   │   ├── web3-config.tsx  # Blockchain configuration
│   │   ├── main.tsx         # React entry point
│   │   └── assets/          # Static assets
│   ├── package.json         # Frontend dependencies & scripts
│   ├── vite.config.ts       # Vite configuration
│   ├── tsconfig.json        # TypeScript project references
│   ├── tsconfig.app.json    # App TypeScript config
│   └── eslint.config.js     # ESLint configuration
└── package.json             # Root dependencies (ethers.js)
```

## Future Development Priorities

Based on `Docs/frontend.md`, the next implementation phases are:
1. **Embedded Wallet Integration**: Coinbase Wallet SDK for user wallet creation
2. **Fiat On-Ramp**: Coinbase Onramp SDK for credit card funding
3. **Donation Flow UI**: Multi-step component with state management
4. **Admin Portal**: MetaMask integration with access control
5. **Backend API**: Vercel functions for donor tracking and notifications
6. **FIFO Notification System**: Email notifications tied to wallet addresses

## Security Considerations

- The charity admin address is stored on-chain and verified in the smart contract
- Admin functions should be gated by wallet signature verification
- Donor wallets (once implemented) will use embedded wallets with email authentication
- All sensitive configuration (RPC URLs, API keys) must use environment variables
