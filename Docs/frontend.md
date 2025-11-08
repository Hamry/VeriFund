# Frontend

Here is the revised, in-depth outline of the frontend, updated to reflect the more robust **Embedded Wallet + Onramp** architecture. This model solves your donor-tracking problem perfectly.

---

### **1. Core Technology Stack**

- **View Layer:** **React (via Vite)**
- **Styling:** **Tailwind CSS**
- **Blockchain Interaction:** **Ethers.js (v6) or Viem** (To craft transactions and interact with your contract)
- **Wallet Creation:** **Coinbase Embedded Wallets SDK** (To create, manage, and get a "signer" for the user's invisible wallet)
- **Fiat On-Ramp:** **Coinbase Onramp SDK** (To let the user fund their embedded wallet with a credit card)
- **Deployment & Backend:** **Vercel** (For hosting the React app and running your serverless functions)

**Guiding Question:** You'll have two "signer" objects in this app: one from the **Embedded Wallet SDK** (for the _donor_) and one from `BrowserProvider` (MetaMask, for the _charity admin_). How will you architect your Ethers.js "Contract" instances to flexibly use the correct signer depending on who is using the app?

---

### **2. Component & Page Architecture**

#### A. Public Portal (The "Storefront")

_Visible to everyone. Focused on a seamless, "web2-style" donation flow._

- **`App.tsx` (Main Entry)**
  - Handles routing (`/` and `/admin`).
  - Initializes the **Embedded Wallet SDK** provider, wrapping the entire app so any component can access the user's wallet state.
- **`DonationFlow.tsx` (The Main Component)**
  - **What it does:** This is a "state machine" component that manages the entire donor journey, which now has 3 distinct steps. It renders different UI based on the user's state.
  - **UI (State 1: Logged Out):**
    - Shows a "Sign in with Email to Donate" button.
    - On click, it uses the **Embedded Wallet SDK** to authenticate the user (e.g., email magic link).
  - **UI (State 2: Logged In, Wallet Unfunded):**
    - Renders a `FundWallet.tsx` component. This component knows the user's embedded wallet address.
    - Shows: "Welcome! Fund your wallet to donate."
  - **UI (State 3: Logged In, Wallet Funded):**
    - Renders a `MakeDonation.tsx` component.
    - Shows the user's wallet balance (e.g., "You have: 0.01 ETH").
  - **Guiding Question:** How will you manage this user `state` (e.g., `status: 'LOGGED_OUT' | 'LOGGED_IN' | 'FUNDED'`)? Will you use React's `useState`, `useReducer`, or a `React Context` to share this status across components?
- **`FundWallet.tsx` (Sub-Component)**
  - **What it does:** Opens the Onramp widget to fund the user's _own_ embedded wallet.
  - **UI:** An input for `amount_usd` and a "Fund with Credit Card" button.
  - **Interaction:**
    1. It gets the user's embedded wallet address (e.g., `0x123...`) from the Embedded Wallet SDK.
    2. On "Fund" click, it opens the **Coinbase Onramp SDK** widget.
    3. It passes the `destination_address: "0x123..."` to the widget.
    4. The user pays; their embedded wallet receives the ETH. The component now shows their new balance.
- **`MakeDonation.tsx` (Sub-Component)**
  - **What it does:** Calls your smart contract's `donate()` function _from_ the user's funded embedded wallet.
  - **UI:** An input for `donation_amount_eth` and a "Donate to Vault" button.
  - **Interaction:**
    1. Gets the "signer" from the **Embedded Wallet SDK**.
    2. Creates a _writeable_ contract instance using this signer.
    3. On "Donate" click, it calls `contract.donate({ value: ... })`.
    4. This `msg.sender` is now the user's unique `0x123...` address, which your backend can perfectly track.
- **`PublicLedger.tsx` (The "Read-Only" Ledger)**
  - **What it does:** Shows a real-time list of all donations and reimbursements.
  - **Interaction:** Connects to the blockchain with a _read-only_ provider and subscribes to the `DonationReceived` and `ReimbursementPaid` events.
  - **Guiding Question:** The `DonationReceived` event now logs the donor's unique `0x123...` address. How will your UI display this? Will you show the raw address, or will you create a "pretty" anonymized ID (e.g., "Donor #af4c")?

#### B. Admin Portal (The "Back Office")

_Gated by the charity's \_external_ MetaMask wallet. Unchanged from the previous design.\_

- **`AdminWrapper.tsx` (The "Security Gate")**
  - **What it does:** Gated page that connects to **MetaMask** (not the Embedded Wallet) and checks if `signer.address === charityAddress`.
- **`ReimbursementForm.tsx` (The "Write" Tool)**
  - **What it does:** Uses the _MetaMask signer_ to call the `requestReimbursement` function.

---

### **3. Key Interaction Points (The "Glue")**

Your frontend is orchestrating 5 separate, asynchronous services.

1. **To Embedded Wallet SDK:**

   - **How:** `coinbase.init(...)`, `wallet.getSigner()`, etc.
   - **Who:** `App.tsx` (to init), `DonationFlow.tsx` (to sign in), `MakeDonation.tsx` (to get signer).
   - **Purpose:** Create a wallet and get a "signer" to approve the final donation.

2. **To On-Ramp SDK:**

   - **How:** `onramp.init(...)`
   - **Who:** `FundWallet.tsx`.
   - **Purpose:** Get fiat (USD) from the donor and send it _to the user's embedded wallet_.

3. **To Vercel Backend API (Your Off-Chain Brain):**

   - **How:** `fetch` (POST requests)
   - **Who:** The user's _browser_ right after the Embedded Wallet is created.
   - **Purpose:** To call `/api/subscribe` and save the `{ email, wallet_address: "0x123..." }` mapping. This is the crucial link for your FIFO notifications.

4. **To Smart Contract (Write-Donor):**

   - **How:** `ethers.Contract` + **Embedded Wallet signer**
   - **Who:** `MakeDonation.tsx`.
   - **Purpose:** To call `donate()`.

5. **To Smart Contract (Write-Charity):**

   - **How:** `ethers.Contract` + **MetaMask signer**
   - **Who:** `ReimbursementForm.tsx`.
   - **Purpose:** To call `requestReimbursement()`.

---

### **4. Key Challenge Solved (And a New One)**

- **SOLVED:** The "Race Condition" / "Fuzzy Matching" problem is **gone**. By creating a unique wallet for each user, you have a 100% reliable, cryptographically-proven link between the user's email and their on-chain donation address. Your FIFO queue will work perfectly.
- **NEW CHALLENGE (State Management):** Your new frontend challenge is managing the user's state. You must answer:
  1. Is the user logged in? (Does the app have access to their embedded wallet?)
  2. Is their wallet funded? (This requires an async call to get their ETH balance.)
  3. How do you "refresh" the UI when the Onramp `onSuccess` callback fires, letting the `DonationFlow` component know it's time to move from "State 2" (Fund) to "State 3" (Donate)?

This architecture is more complex to _build_ on the frontend, but it's 10x more robust and delivers on your core "FIFO notification" idea.
