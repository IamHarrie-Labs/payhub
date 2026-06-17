/**
 * Monad chain interaction — reads PayHub contract events and submits arbiter transactions.
 */
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));

const RPC  = process.env.MONAD_RPC_URL     || "https://testnet-rpc.monad.xyz";
const PK   = process.env.ARBITER_PRIVATE_KEY;

let _provider, _signer, _contract, _deployment;

function deployment() {
  if (_deployment) return _deployment;
  try {
    _deployment = JSON.parse(readFileSync(resolve(__dir, "../../deployment.json"), "utf8"));
  } catch {
    _deployment = { PayHub: process.env.PAYHUB_CONTRACT_ADDRESS || "" };
  }
  return _deployment;
}

const ABI = [
  "event PaymentInitiated(bytes32 indexed paymentId, address indexed payer, address indexed merchant, address token, uint256 amount, string orderId, uint256 finalityDeadline)",
  "event PaymentSettled(bytes32 indexed paymentId, address merchant, uint256 amount)",
  "event DisputeOpened(bytes32 indexed paymentId, address indexed payer, string reason, uint256 responseDeadline)",
  "event MerchantResponded(bytes32 indexed paymentId, string evidence)",
  "event DisputeResolved(bytes32 indexed paymentId, address resolvedFor, string verdict)",
  "event PaymentRefunded(bytes32 indexed paymentId, address indexed payer, uint256 amount)",
  "function resolveDispute(bytes32 paymentId, bool inFavorOfPayer, string calldata verdict) external",
  "function autoResolveExpiredDispute(bytes32 paymentId) external",
  "function getPayment(bytes32 paymentId) external view returns (tuple(bytes32 id, address payer, address merchant, address token, uint256 amount, uint256 createdAt, uint256 finalityWindow, uint256 disputeWindow, uint8 status, string orderId, string apassPayer, string apassMerchant))",
  "function getDispute(bytes32 paymentId) external view returns (tuple(bytes32 paymentId, string reason, uint256 openedAt, uint256 responseDeadline, bool merchantResponded, string merchantEvidence, address resolvedFor))",
];

export function getProvider() {
  if (!_provider) _provider = new ethers.JsonRpcProvider(RPC);
  return _provider;
}

export function getSigner() {
  if (!PK) throw new Error("ARBITER_PRIVATE_KEY not set");
  if (!_signer) _signer = new ethers.Wallet(PK, getProvider());
  return _signer;
}

export function getContract(signerOrProvider) {
  const addr = deployment().PayHub;
  if (!addr) throw new Error("PayHub contract address not set — deploy first or set PAYHUB_CONTRACT_ADDRESS");
  return new ethers.Contract(addr, ABI, signerOrProvider || getProvider());
}

export async function getPayment(paymentId) {
  const c = getContract();
  return c.getPayment(paymentId);
}

export async function getDispute(paymentId) {
  const c = getContract();
  return c.getDispute(paymentId);
}

export async function arbiterResolve(paymentId, inFavorOfPayer, verdict) {
  const c   = getContract(getSigner());
  const tx  = await c.resolveDispute(paymentId, inFavorOfPayer, verdict);
  const rec = await tx.wait();
  return { txHash: rec.hash, blockNumber: rec.blockNumber };
}

export async function autoResolveExpired(paymentId) {
  const c   = getContract(getSigner());
  const tx  = await c.autoResolveExpiredDispute(paymentId);
  const rec = await tx.wait();
  return { txHash: rec.hash, blockNumber: rec.blockNumber };
}

export async function getRecentEvents(fromBlock = "latest") {
  const c = getContract();
  const filter = { fromBlock, toBlock: "latest" };
  const events = await c.queryFilter("*", filter.fromBlock, filter.toBlock);
  return events.map(e => ({
    event:  e.fragment?.name,
    args:   Object.fromEntries(Object.entries(e.args || {}).filter(([k]) => isNaN(k))),
    txHash: e.transactionHash,
    block:  e.blockNumber,
  }));
}
