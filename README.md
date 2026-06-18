# PayHub

**Dispute and chargeback rail for AI agent payments on Monad.**

Built for the [Cleanverse Verified Finance Hackathon](https://cleanverse.com). PayHub lets autonomous agents make compliant stablecoin payments with full identity verification, escrow, and dispute resolution — all backed by the Cleanverse compliance stack.

---

## The problem

AI agents can initiate payments. What they can't do is recover from a payment that goes wrong. When an agent pays a merchant and the merchant doesn't deliver, there's no identity-bound recourse: no wallet signature authority to open a chargeback, no compliance trail an auditor could verify, no refund path that a financial regulator would accept.

PayHub fixes that. Every payment is escrowed on-chain, both parties are A-Pass verified before a single token moves, and the refund — if it happens — goes back to the original verified payer wallet only.

---

## How it works

```
Payer (agent)                    PayHub contract              Merchant
     │                                  │                         │
     │── POST /payments/preflight ──►  API                        │
     │   (A-Pass + CCP + Travel Rule)   │                         │
     │◄── compliance OK ────────────────│                         │
     │                                  │                         │
     │── initiatePayment() ────────────►│ ◄── funds held in escrow│
     │                                  │                         │
     │         [finality window — 3 days by default]              │
     │                                  │                         │
     │── openDispute() ────────────────►│                         │
     │                                  │── respondToDispute() ──►│
     │                                  │                         │
     │     [arbiter reviews evidence]   │                         │
     │                                  │                         │
     │◄── refund to original wallet ────│ (CCP-screened refund)   │
     │                                  │                         │
     │── GET /payments/:id/audit ──────►│                         │
     │◄── signed audit bundle ──────────│                         │
```

### Payment lifecycle

| Status | Description |
|--------|-------------|
| `PENDING` | Funds escrowed, finality window active |
| `SETTLED` | Merchant claimed after window; no dispute possible |
| `DISPUTED` | Payer opened dispute before window closed |
| `REFUNDED` | Arbiter resolved in payer's favour; funds returned to source wallet |

---

## Cleanverse integration

PayHub uses four Cleanverse primitives, each enforced at the right point in the flow:

| Primitive | Where | What it does |
|-----------|-------|--------------|
| **A-Pass** | `POST /payments/preflight` | Verifies both payer and merchant identity before payment |
| **A-Pass** | `POST /payments/:id/dispute/preflight` | Re-verifies the payer's identity before a dispute is accepted |
| **CCP** | `POST /payments/preflight` | Screens the payment leg against sanctions and AML |
| **CCP** | `POST /payments/:id/resolve` | Screens the refund leg before execution |
| **Travel Rule** | Both preflight calls | Attaches originator/beneficiary metadata to every payment and refund |
| **A-Token** | Escrow contract | The compliant stablecoin held in PayHub escrow (aUSDC on Monad testnet) |

The backend runs all compliance checks before any on-chain transaction is submitted. The smart contract stores the A-Pass IDs on-chain for audit trail purposes.

---

## Tech stack

| Layer | Stack |
|-------|-------|
| Smart contract | Solidity 0.8.20 · OpenZeppelin · Hardhat · Monad Testnet |
| Backend | Node.js (ESM) · Express · Cleanverse Cooperate API v5 |
| Frontend | Next.js 15 · ethers.js v6 · Tailwind v4 |
| Wallet | MetaMask · WalletConnect v2 · Coinbase Wallet |

**Deployed contract:** [`0x7BBDa4409e300eaDB0A61F137498480c96173C9e`](https://testnet.monad.xyz/address/0x7BBDa4409e300eaDB0A61F137498480c96173C9e) on Monad Testnet

---

## Repository structure

```
payhub/
├── contracts/
│   ├── contracts/
│   │   ├── PayHub.sol        # Main escrow + dispute contract
│   │   └── MockERC20.sol     # Test token
│   ├── scripts/
│   │   └── deploy.js         # Hardhat deploy script
│   ├── test/
│   │   └── PayHub.test.js    # 7 contract tests
│   └── hardhat.config.js
├── backend/
│   └── src/
│       ├── index.js          # Express server
│       ├── cleanverse.js     # Cleanverse API wrapper (A-Pass, CCP, Travel Rule)
│       ├── chain.js          # ethers.js contract interaction
│       ├── audit.js          # Signed audit bundle generator
│       └── routes/
│           └── payments.js   # All payment routes
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.jsx      # Landing page
│       │   ├── demo/         # Interactive demo flow
│       │   └── dashboard/    # Payment history + audit downloads
│       ├── components/       # PaymentCard, ComplianceCheck, AuditReport, StatusBadge
│       └── lib/
│           ├── wallet.js     # MetaMask / WalletConnect connector
│           └── api.js        # Backend API client
├── deployment.json           # Deployed contract addresses
├── .env.example              # All required env vars, documented
└── SETUP.md                  # Quick setup guide
```

---

## Setup

### Prerequisites

- Node.js 18+
- MetaMask with [Monad Testnet](https://testnet.monad.xyz) configured
- Monad testnet MON (from the [Monad faucet](https://faucet.monad.xyz))
- Cleanverse sandbox credentials

### 1. Clone and install

```bash
git clone https://github.com/IamHarrie-Labs/payhub.git
cd payhub
npm run install:all
```

Or install each layer separately:

```bash
cd contracts && npm install
cd ../backend  && npm install
cd ../frontend && npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in the required values:

```env
# Cleanverse (from your sandbox credentials)
CLEANVERSE_API_BASE=https://uatapi.cleanverse.com/api/cooperate
CLEANVERSE_APP_ID=your_app_id
CLEANVERSE_API_KEY=your_api_key

# Monad testnet wallets
DEPLOYER_PRIVATE_KEY=0x...
ARBITER_PRIVATE_KEY=0x...
ARBITER_ADDRESS=0x...

# Filled after deploy (step 4)
PAYHUB_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_PAYHUB_CONTRACT=0x...
```

Copy to backend and frontend:

```bash
cp .env backend/.env
cp .env frontend/.env.local
```

> **Mock mode:** if `CLEANVERSE_API_KEY` is not set, the backend returns realistic fixture data so the demo runs without a live sandbox key.

### 3. Compile and test the contract

```bash
cd contracts
npx hardhat compile
npx hardhat test
```

All 7 tests should pass.

### 4. Deploy to Monad Testnet

```bash
cd contracts
npx hardhat run scripts/deploy.js --network monad_testnet
```

The script writes `deployment.json` and prints the contract address. Copy it into `.env` as shown in step 2.

### 5. Run locally

Terminal 1 — backend:

```bash
cd backend
npm run dev
# → http://localhost:3001
```

Terminal 2 — frontend:

```bash
cd frontend
npm run dev
# → http://localhost:3000
```

---

## Demo flow

1. Open `http://localhost:3000` and connect MetaMask (Monad Testnet)
2. Navigate to `/demo`
3. Enter a merchant wallet address
4. Click **Run compliance checks** — A-Pass, CCP, and Travel Rule all run in sequence
5. Click **Pay 50 A-Token** — funds move into escrow on-chain
6. Click **Open dispute** — backend re-verifies payer identity via A-Pass
7. Click **Resolve & refund to source** — CCP screens the refund, funds return to original wallet
8. Click **Download audit bundle** — signed JSON with the full compliance trail

---

## Smart contract

**`PayHub.sol`** — [`contracts/contracts/PayHub.sol`](contracts/contracts/PayHub.sol)

### Key functions

```solidity
// Initiate a payment (payer calls this after backend preflight)
function initiatePayment(
    address merchant,
    address token,
    uint256 amount,
    string orderId,
    string apassPayer,      // A-Pass ID stored on-chain for audit
    string apassMerchant,
    uint256 customFinality  // 0 = use 3-day default
) external returns (bytes32 paymentId)

// Merchant claims settled funds after finality window
function claimPayment(bytes32 paymentId) external

// Payer opens a dispute (only during dispute window)
function openDispute(bytes32 paymentId, string reason) external

// Merchant submits evidence (within 24h response window)
function respondToDispute(bytes32 paymentId, string evidence) external

// Arbiter resolves — inFavorOfPayer=true triggers refund to source
function resolveDispute(bytes32 paymentId, bool inFavorOfPayer, string verdict) external

// Auto-refund if merchant misses their response window
function autoResolveExpiredDispute(bytes32 paymentId) external
```

### Default timings

| Parameter | Default |
|-----------|---------|
| Finality window | 3 days |
| Dispute window | 2 days |
| Merchant response window | 24 hours |
| Platform fee | 0.5% (max 2%) |

All configurable by contract owner.

---

## Backend API

Base URL: `http://localhost:3001`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Service health check |
| `POST` | `/payments/preflight` | A-Pass + CCP + Travel Rule pre-check for both parties |
| `POST` | `/payments/register` | Store enriched metadata after on-chain `initiatePayment` |
| `GET` | `/payments/:id` | Fetch payment details + current on-chain status |
| `POST` | `/payments/:id/dispute/preflight` | Verify caller is the original A-Pass-verified payer |
| `POST` | `/payments/:id/dispute/register` | Store dispute metadata |
| `POST` | `/payments/:id/resolve` | Arbiter resolves; CCP-screens refund before execution |
| `POST` | `/payments/:id/auto-resolve` | Auto-refund after merchant response window expires |
| `GET` | `/payments/:id/audit` | Fetch signed audit bundle (HMAC-signed JSON) |

### Example: preflight request

```bash
curl -X POST http://localhost:3001/payments/preflight \
  -H "Content-Type: application/json" \
  -d '{
    "payerAddress": "0xABC...",
    "merchantAddress": "0xDEF...",
    "amount": "50",
    "currency": "AUSDC"
  }'
```

### Example: preflight response

```json
{
  "approved": true,
  "apassPayer":    { "cvRecordId": "434", "status": "APPROVED" },
  "apassMerchant": { "cvRecordId": "435", "status": "APPROVED" },
  "ccp":           { "status": "CLEARED", "riskScore": 12 },
  "travelRule":    { "attached": true, "messageId": "TR-0x..." }
}
```

---

## Audit bundle

Every payment produces a downloadable audit bundle — a signed JSON file containing:

- Payment ID and on-chain transaction hash
- A-Pass verification records for both parties
- CCP screening results for payment and refund legs
- Travel Rule message IDs
- Dispute timeline (if applicable)
- HMAC signature for tamper detection

```json
{
  "paymentId": "0x...",
  "txHash": "0x...",
  "compliance": {
    "apassPayer":    { "cvRecordId": "434", "verifiedAt": "..." },
    "apassMerchant": { "cvRecordId": "435", "verifiedAt": "..." },
    "ccpPayment":    { "status": "CLEARED", "screenedAt": "..." },
    "ccpRefund":     { "status": "CLEARED", "screenedAt": "..." },
    "travelRule":    { "messageId": "...", "attachedAt": "..." }
  },
  "dispute": { ... },
  "signature": "sha256=..."
}
```

---

## Monad Testnet configuration

Add this network to MetaMask manually if it doesn't auto-add:

| Field | Value |
|-------|-------|
| Network name | Monad Testnet |
| RPC URL | `https://testnet-rpc.monad.xyz` |
| Chain ID | `10143` |
| Currency symbol | `MON` |
| Block explorer | `https://testnet.monad.xyz` |

Get testnet MON from the [Monad faucet](https://faucet.monad.xyz).

---

## License

MIT
