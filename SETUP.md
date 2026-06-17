# PayHub — Setup & Run Guide

## What's built

| Layer     | Stack                                              |
|-----------|----------------------------------------------------|
| Contract  | Solidity 0.8.20 · OpenZeppelin · Hardhat · Monad  |
| Backend   | Node.js ESM · Express · Cleanverse API v3          |
| Frontend  | Next.js 15 · Tailwind v4 · ethers.js v6            |

---

## 1. Environment

Copy and fill the env file:
```
cp .env.example .env
```

Fill in:
- `CLEANVERSE_API_KEY` — from your Cleanverse sandbox email
- `DEPLOYER_PRIVATE_KEY` / `ARBITER_PRIVATE_KEY` — Monad testnet wallet keys
- `ATOKEN_ADDRESS` — Cleanverse A-Token contract on Monad testnet (check docs)
- Leave `PAYHUB_CONTRACT_ADDRESS` blank until step 3

Also copy `.env` to `backend/` and `frontend/` (or symlink):
```
cp .env backend/.env
cp .env frontend/.env.local
```

---

## 2. Install dependencies

```
npm run install:all
```

Or separately:
```
cd contracts && npm install
cd ../backend  && npm install
cd ../frontend && npm install
```

---

## 3. Compile & test the contract

```
cd contracts
npx hardhat compile
npx hardhat test
```

All 7 tests should pass.

---

## 4. Deploy to Monad Testnet

Get testnet MON from the Monad faucet first.

```
cd contracts
npx hardhat run scripts/deploy.js --network monad_testnet
```

This writes `deployment.json` to the project root and prints the contract address.
Copy the address into `.env`:
```
PAYHUB_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_PAYHUB_CONTRACT=0x...
```

---

## 5. Run locally

Terminal 1 — backend API:
```
cd backend && npm run dev
# → http://localhost:3001
```

Terminal 2 — frontend:
```
cd frontend && npm run dev
# → http://localhost:3000
```

---

## 6. Demo flow

1. Open http://localhost:3000
2. Click **Try it live →** → goes to `/demo`
3. Connect MetaMask (Monad Testnet)
4. Enter a merchant wallet address
5. Click **Run compliance checks** — watch A-Pass, CCP, Travel Rule all green
6. Click **Pay 50 A-Token**
7. Click **Open dispute** — identity check fires server-side
8. Click **Resolve & refund to source**
9. Download the signed audit bundle

---

## API endpoints (backend)

| Method | Path                             | Description                              |
|--------|----------------------------------|------------------------------------------|
| POST   | /payments/preflight              | A-Pass + CCP + Travel Rule pre-check     |
| POST   | /payments/register               | Store enriched metadata after on-chain tx|
| GET    | /payments/:id                    | Fetch payment + on-chain status          |
| POST   | /payments/:id/dispute/preflight  | Verify caller is original payer          |
| POST   | /payments/:id/dispute/register   | Store dispute metadata                   |
| POST   | /payments/:id/resolve            | Arbiter resolves (CCP-screens refund)    |
| POST   | /payments/:id/auto-resolve       | Auto-refund if merchant missed window    |
| GET    | /payments/:id/audit              | Fetch signed audit bundle                |

---

## Contract (PayHub.sol)

Key functions:
- `initiatePayment(merchant, token, amount, orderId, apassPayer, apassMerchant, finality)`
- `claimPayment(paymentId)` — merchant, after finality window
- `openDispute(paymentId, reason)` — payer only, during dispute window
- `respondToDispute(paymentId, evidence)` — merchant, within 24 h
- `resolveDispute(paymentId, inFavorOfPayer, verdict)` — arbiter only
- `autoResolveExpiredDispute(paymentId)` — anyone, after merchant response window

---

## Cleanverse integration points

| Primitive    | Where used                                                    |
|--------------|---------------------------------------------------------------|
| A-Pass       | `/payments/preflight` — verify both parties before payment    |
|              | `/payments/:id/dispute/preflight` — re-verify payer at dispute|
| CCP          | `/payments/preflight` — screen payment leg                    |
|              | `/payments/:id/resolve` — screen refund leg                   |
| Travel Rule  | Metadata attached to payment & refund in both preflight calls |
| A-Token      | ERC-20 token held in PayHub escrow contract                   |

Mock mode: if `CLEANVERSE_API_KEY` is not set, the backend returns plausible fixture
data so the demo runs without a live sandbox key.
