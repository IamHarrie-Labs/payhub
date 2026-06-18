import { ethers } from "ethers";

const RPC = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const PK  = process.env.ARBITER_PRIVATE_KEY;

let _provider, _signer;

const ABI = [
  "function resolveDispute(bytes32 paymentId, bool inFavorOfPayer, string calldata verdict) external",
  "function autoResolveExpiredDispute(bytes32 paymentId) external",
  "function getPayment(bytes32 paymentId) external view returns (tuple(bytes32 id, address payer, address merchant, address token, uint256 amount, uint256 createdAt, uint256 finalityWindow, uint256 disputeWindow, uint8 status, string orderId, string apassPayer, string apassMerchant))",
  "function getDispute(bytes32 paymentId) external view returns (tuple(bytes32 paymentId, string reason, uint256 openedAt, uint256 responseDeadline, bool merchantResponded, string merchantEvidence, address resolvedFor))",
];

function getProvider() {
  if (!_provider) _provider = new ethers.JsonRpcProvider(RPC);
  return _provider;
}

function getSigner() {
  if (!PK) throw new Error("ARBITER_PRIVATE_KEY not set");
  if (!_signer) _signer = new ethers.Wallet(PK, getProvider());
  return _signer;
}

function getContract(signerOrProvider) {
  const addr = process.env.PAYHUB_CONTRACT_ADDRESS;
  if (!addr) throw new Error("PAYHUB_CONTRACT_ADDRESS not set");
  return new ethers.Contract(addr, ABI, signerOrProvider || getProvider());
}

export async function getPayment(paymentId) {
  return getContract().getPayment(paymentId);
}

export async function getDispute(paymentId) {
  return getContract().getDispute(paymentId);
}

export async function arbiterResolve(paymentId, inFavorOfPayer, verdict) {
  const tx  = await getContract(getSigner()).resolveDispute(paymentId, inFavorOfPayer, verdict);
  const rec = await tx.wait();
  return { txHash: rec.hash };
}

export async function autoResolveExpired(paymentId) {
  const tx  = await getContract(getSigner()).autoResolveExpiredDispute(paymentId);
  const rec = await tx.wait();
  return { txHash: rec.hash };
}
