import { ethers } from "ethers";

const CHAIN_ID   = 10143;
const CHAIN_NAME = "Monad Testnet";
const RPC_URL    = "https://testnet-rpc.monad.xyz";
const WC_PROJECT = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "3a51c74b61016e1b9b70d3734dcb145c";

const PAYHUB_ABI = [
  "function initiatePayment(address merchant, address token, uint256 amount, string orderId, string apassPayer, string apassMerchant, uint256 customFinality) external returns (bytes32)",
  "function openDispute(bytes32 paymentId, string reason) external",
  "function respondToDispute(bytes32 paymentId, string evidence) external",
  "function claimPayment(bytes32 paymentId) external",
  "function autoResolveExpiredDispute(bytes32 paymentId) external",
  "function getPayment(bytes32 paymentId) external view returns (tuple(bytes32 id, address payer, address merchant, address token, uint256 amount, uint256 createdAt, uint256 finalityWindow, uint256 disputeWindow, uint8 status, string orderId, string apassPayer, string apassMerchant))",
  "function isDisputeWindowOpen(bytes32 paymentId) external view returns (bool)",
  "event PaymentInitiated(bytes32 indexed paymentId, address indexed payer, address indexed merchant, address token, uint256 amount, string orderId, uint256 finalityDeadline)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
];

// ─── Ensure wallet is on Monad Testnet ────────────────────────────────────────
async function ensureMonadChain(raw) {
  try {
    await raw.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
    });
  } catch (err) {
    if (err.code === 4902 || err.code === -32603) {
      await raw.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId:           `0x${CHAIN_ID.toString(16)}`,
          chainName:         CHAIN_NAME,
          nativeCurrency:    { name: "MON", symbol: "MON", decimals: 18 },
          rpcUrls:           [RPC_URL],
          blockExplorerUrls: ["https://testnet.monad.xyz"],
        }],
      });
    } else if (err.code !== 4001) {
      throw err;
    }
  }
}

// ─── Connect via injected wallet (MetaMask / Coinbase / Brave) ───────────────
export async function connectWallet(rawProvider) {
  const raw = rawProvider ?? window.ethereum;
  if (!raw) throw new Error("No wallet detected. Install MetaMask from metamask.io");

  // Explicitly triggers the wallet popup
  await raw.request({ method: "eth_requestAccounts" });
  await ensureMonadChain(raw);

  const provider = new ethers.BrowserProvider(raw);
  const signer   = await provider.getSigner();
  const address  = await signer.getAddress();
  return { provider, signer, address, rawProvider: raw, walletType: "injected" };
}

// ─── Connect via WalletConnect v2 (QR code — mobile wallets) ─────────────────
// Loaded via window.ethereum fallback — WalletConnect ESM has broken subpath
// exports that conflict with Next.js bundler, so we surface a clear message
// instead of crashing the build.
export async function connectWalletConnect() {
  throw new Error(
    "WalletConnect is not available in this build. Use MetaMask or Coinbase Wallet instead."
  );
}

// ─── Contract helpers ─────────────────────────────────────────────────────────
export function getPayHubContract(signer) {
  const addr = process.env.NEXT_PUBLIC_PAYHUB_CONTRACT;
  if (!addr) throw new Error("NEXT_PUBLIC_PAYHUB_CONTRACT not set");
  return new ethers.Contract(addr, PAYHUB_ABI, signer);
}

export function getTokenContract(signer, tokenAddress) {
  return new ethers.Contract(tokenAddress, ERC20_ABI, signer);
}

export async function approveToken(signer, tokenAddress, spender, amount) {
  const token     = getTokenContract(signer, tokenAddress);
  const allowance = await token.allowance(await signer.getAddress(), spender);
  if (allowance >= amount) return null;
  const tx = await token.approve(spender, amount);
  return tx.wait();
}

export async function initiatePayment(signer, { merchant, token, amount, orderId, apassPayer, apassMerchant }) {
  const contract   = getPayHubContract(signer);
  const payhubAddr = process.env.NEXT_PUBLIC_PAYHUB_CONTRACT;
  await approveToken(signer, token, payhubAddr, amount);
  const tx  = await contract.initiatePayment(merchant, token, amount, orderId, apassPayer, apassMerchant, 0);
  const rec = await tx.wait();
  const iface = contract.interface;
  const event = rec.logs
    .map(l => { try { return iface.parseLog(l); } catch { return null; } })
    .find(e => e?.name === "PaymentInitiated");
  return { txHash: rec.hash, paymentId: event?.args?.paymentId };
}

export async function openDisputeOnChain(signer, paymentId, reason) {
  const contract = getPayHubContract(signer);
  const tx  = await contract.openDispute(paymentId, reason);
  const rec = await tx.wait();
  return { txHash: rec.hash };
}

export async function respondToDisputeOnChain(signer, paymentId, evidence) {
  const contract = getPayHubContract(signer);
  const tx  = await contract.respondToDispute(paymentId, evidence);
  const rec = await tx.wait();
  return { txHash: rec.hash };
}

export async function getPaymentOnChain(provider, paymentId) {
  const addr = process.env.NEXT_PUBLIC_PAYHUB_CONTRACT;
  const c = new ethers.Contract(addr, PAYHUB_ABI, provider);
  return c.getPayment(paymentId);
}
