# VeriFund - Coinbase Embedded Wallets Implementation Summary

## ✅ What's Been Implemented

### Backend (Vercel Serverless Functions)
- **`/api/lib/auth.ts`** - JWT authentication for CDP API
- **`/api/onramp/buy-options.ts`** - Endpoint for fetching payment methods
- **`/api/onramp/buy-quote.ts`** - Endpoint for creating buy quotes/session tokens
- **`vercel.json`** - Vercel deployment configuration

### Frontend Updates

#### Core Configuration
- **`main.tsx`** - Configured Smart Accounts with gas sponsorship
  - Users create Smart Accounts (not EOAs)
  - Gas fees automatically sponsored on Base Sepolia
  - Email-only authentication

#### Components
- **`DonationFlow.tsx`** - Simplified with Coinbase AuthButton
  - Uses `<AuthButton />` for login/logout
  - Uses `useCurrentUser()` to access user and Smart Account
  - Shows Smart Account address when logged in

- **`FundWallet.tsx`** - Integrated Coinbase FundModal
  - Uses `<FundModal />` with backend API endpoints
  - Uses `useCurrentUser()` to get Smart Account address
  - Supports credit card funding
  - Preset amounts: $10, $25, $50, $100

- **`MakeDonation.tsx`** - Updated for Smart Accounts
  - Uses `useCurrentUser()` and `useSendUserOperation()` hooks
  - Sends user operations instead of regular transactions
  - Tracks operation status with `status`, `data`, `error`
  - Balance auto-refreshes every 10 seconds

#### Utilities
- **`lib/onramp-api.ts`** - API client for backend endpoints
  - `getBuyOptions()` - Fetch payment methods
  - `createBuyQuote()` - Create session tokens

### Environment Variables
Your `.env.local` now includes:
- `VITE_COINBASE_PROJECT_ID` - Frontend project ID
- `CDP_API_KEY_NAME` - Backend API key ID
- `CDP_API_KEY_PRIVATE_KEY` - Backend API secret

## 🚀 How to Test

### 1. Start Development Server
```bash
cd VeriFund-frontend
npm run dev
```

### 2. User Flow
1. **Visit** http://localhost:5173
2. **Click** "Sign In" (AuthButton)
3. **Enter email** and verify OTP code
4. **Smart Account created** automatically
5. **Fund wallet** (optional - click "Need to add more funds?")
6. **Make donation** - enter amount and donate
7. **Gas sponsored** - no additional ETH needed for fees!

## 📖 CDP Hooks Reference

### Correct Hook Usage
According to Coinbase docs, use these hooks:
- `useCurrentUser()` - Get authenticated user and Smart Account
  - Access Smart Account: `currentUser?.evmSmartAccounts?.[0]`
  - Access email: `currentUser?.email`
- `useSendUserOperation()` - Send user operations from Smart Accounts
  - Returns: `{ sendUserOperation, status, data, error }`
- `useEvmAddress()` - Get primary address (Smart Account if present, else EOA)

**Note**: There is NO `useEvmSmartAccount` hook - that was my mistake!

## 🎯 Key Features

### Smart Accounts (ERC-4337)
- Users don't need ETH for gas fees
- You (the charity) sponsor gas on Base Sepolia
- Seamless UX - donors only see donation amounts

### Embedded Wallets
- No MetaMask required
- No seed phrases
- Email login only
- Wallet created automatically

### Onramp Integration
- Credit card funding
- Instant availability
- USD → ETH conversion
- Secure Coinbase payment flow

## ⚠️ Important Notes

### Gas Sponsorship
- Currently works on **Base Sepolia** (testnet)
- For **Ethereum Sepolia**, you need to:
  1. Either disable gas sponsorship (users pay their own gas)
  2. Or set up a custom paymaster

**Current Issue**: Line 71 in `MakeDonation.tsx` specifies `network: "ethereum-sepolia"`, but Coinbase's paymaster only sponsors on Base networks.

### Options to Fix:
1. **Switch to Base Sepolia** (recommended):
   - Update `VITE_RPC_URL` to Base Sepolia
   - Update `CONTRACT_ADDRESS` to your contract on Base Sepolia
   - Change network to `"base-sepolia"` in `MakeDonation.tsx`

2. **Keep Ethereum Sepolia** (users pay gas):
   - Users need extra ETH for gas fees
   - Remove gas sponsorship mention from UI

### Onramp in Development
The Onramp `<FundModal />` may have limitations in development mode:
- Trial mode purchase limits
- May require production verification
- Test with small amounts first

## 📁 New File Structure
```
VeriFund-frontend/
├── api/                          # NEW: Backend serverless functions
│   ├── lib/
│   │   └── auth.ts              # JWT authentication
│   └── onramp/
│       ├── buy-options.ts       # Payment methods endpoint
│       └── buy-quote.ts         # Buy quote endpoint
├── src/
│   ├── lib/
│   │   └── onramp-api.ts        # NEW: API client utilities
│   ├── components/
│   │   ├── DonationFlow.tsx     # UPDATED: Uses AuthButton
│   │   ├── FundWallet.tsx       # UPDATED: Uses FundModal
│   │   └── MakeDonation.tsx     # UPDATED: Smart Account ops
│   └── main.tsx                 # UPDATED: Smart Account config
├── vercel.json                  # NEW: Deployment config
└── .env.local                   # UPDATED: Added API credentials
```

## 🔧 Next Steps

### To Deploy to Vercel:
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel` from `VeriFund-frontend/` directory
3. Set environment variables in Vercel dashboard
4. Add production domain to CDP Portal allowlist

### To Complete the Implementation:
1. Decide on Base Sepolia vs Ethereum Sepolia
2. Deploy your charity contract to chosen network
3. Update environment variables
4. Test the full flow with real testnet ETH
5. Update UI copy and branding

## 🐛 Troubleshooting

### "User operation failed"
- Check your contract is on the right network
- Verify contract address in `.env.local`
- Check network parameter in `MakeDonation.tsx`

### "Onramp not working"
- Verify API keys are correct
- Check backend endpoints are responding: `/api/onramp/buy-options`
- Look for CORS errors in browser console

### "Gas sponsorship not working"
- Only works on Base networks by default
- For Ethereum Sepolia, users need gas ETH
- Check paymaster configuration

## 📚 Resources
- [CDP Embedded Wallets Docs](https://docs.cdp.coinbase.com/embedded-wallets)
- [Smart Accounts Guide](https://docs.cdp.coinbase.com/embedded-wallets/evm-features/smart-accounts)
- [Onramp Integration](https://docs.cdp.coinbase.com/embedded-wallets/onramp-integration)
- [Vercel Deployment](https://vercel.com/docs)
