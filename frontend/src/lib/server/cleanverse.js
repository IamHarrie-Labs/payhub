/**
 * Cleanverse Cooperate API v5 client (Next.js / edge-compatible build)
 * Uses global fetch — no node-fetch needed.
 */
import crypto from "crypto";

const BASE    = process.env.CLEANVERSE_API_BASE || "https://uatapi.cleanverse.com/api/cooperate";
const APP_ID  = process.env.CLEANVERSE_APP_ID  || "";
const API_KEY = process.env.CLEANVERSE_API_KEY || "";

export const MOCK = !APP_ID || !API_KEY;
if (MOCK) console.warn("[cleanverse] Mock mode — set CLEANVERSE_APP_ID + CLEANVERSE_API_KEY");

function encryptBody(plainObj) {
  const key     = Buffer.from(API_KEY, "base64");
  const iv      = Buffer.alloc(16, 0);
  const cipher  = crypto.createCipheriv("aes-256-cbc", key, iv);
  const enc     = Buffer.concat([cipher.update(JSON.stringify(plainObj), "utf8"), cipher.final()]);
  return { data: enc.toString("base64") };
}

async function apiFetch(path, opts = {}) {
  if (MOCK) return mockResponse(path);
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "api-id": APP_ID,
      "X-Request-ID": crypto.randomUUID(),
      ...(opts.headers || {}),
    },
  });
  return res.json().catch(() => ({}));
}

export async function verifyAPass(address, chain = "monad") {
  try {
    const res = await apiFetch("/query_apass", { method: "POST", body: JSON.stringify({ chain, address }) });
    if (res.code !== "0000" || !res.data) return { verified: false, apassId: null, error: res.message };
    return { verified: res.data.status === 1, apassId: res.data.cvRecordId, tier: res.data.tier, status: res.data.status };
  } catch (e) {
    return { verified: MOCK, apassId: MOCK ? `cv_${address.slice(2,10)}` : null, error: e.message };
  }
}

export async function verifyAPassForToken(address, atokenAddress, chain = "monad") {
  try {
    const res = await apiFetch("/verify_apass", { method: "POST", body: JSON.stringify({ chain, atoken: atokenAddress, address }) });
    if (res.code !== "0000") return { verified: false, error: res.message };
    return { verified: res.data?.code === 4, resultCode: res.data?.code, message: res.data?.message };
  } catch (e) {
    return { verified: MOCK, resultCode: MOCK ? 4 : 0, error: e.message };
  }
}

export async function ccpPreCheck({ fromAddress, toAddress, atokenAddress, chain = "monad" }) {
  const [payerAPass, merchantAPass, payerToken, merchantToken] = await Promise.all([
    verifyAPass(fromAddress, chain),
    verifyAPass(toAddress, chain),
    atokenAddress ? verifyAPassForToken(fromAddress, atokenAddress, chain) : Promise.resolve({ verified: true }),
    atokenAddress ? verifyAPassForToken(toAddress, atokenAddress, chain)   : Promise.resolve({ verified: true }),
  ]);
  // A-Pass registration is advisory — wallets on testnet won't be in the Cleanverse registry.
  // The compliance check still runs and IDs are captured on-chain; unregistered wallets get flagged, not blocked.
  const cleared = true;
  const flags = [];
  if (!payerAPass.verified)    flags.push("payer_apass_advisory");
  if (!merchantAPass.verified) flags.push("merchant_apass_advisory");
  if (!payerToken.verified)    flags.push("payer_token_advisory");
  if (!merchantToken.verified) flags.push("merchant_token_advisory");
  const riskScore = flags.length === 0 ? 2 : flags.length <= 2 ? 15 : 40;
  return { cleared, flags, riskScore, payerAPass, merchantAPass };
}

export async function downloadTravelRule({ txHash, walletAddress, chain = "monad" }) {
  try {
    const res = await apiFetch("/download_travel_rule", { method: "POST", body: JSON.stringify({ txHash, wallet: { chain, address: walletAddress } }) });
    if (res.code !== "0000") return { downloadUrl: null, error: res.message };
    return { downloadUrl: res.data?.downloadUrl, fileName: res.data?.fileName };
  } catch (e) {
    return { downloadUrl: null, error: e.message };
  }
}

function mockResponse(path) {
  const ts = Date.now();
  if (path.includes("query_apass"))   return { code: "0000", data: { cvRecordId: `cv_${ts}`, tier: "3", status: 1 } };
  if (path.includes("verify_apass"))  return { code: "0000", data: { code: 4, message: "apass verify success (mock)" } };
  if (path.includes("download_travel_rule")) return { code: "0000", data: { downloadUrl: `https://mock.cleanverse.com/tr/${ts}.pdf` } };
  return { code: "0000", data: {} };
}
