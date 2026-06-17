/**
 * Cleanverse Cooperate API v5 client
 *
 * Auth: every request sends `api-id` in the header. No login, no Bearer token.
 * Encryption: selected endpoints require the request body to be AES-256-CBC encrypted
 *   with the api-key (base64-decoded) and a fixed IV of 16 zero bytes, sent as {"data":"<base64>"}
 *
 * Sandbox base: https://uatapi.cleanverse.com/api/cooperate
 *
 * Credentials (from env):
 *   CLEANVERSE_APP_ID  — sent as api-id header
 *   CLEANVERSE_API_KEY — base64-encoded AES key, used locally for encryption only
 */

import fetch  from "node-fetch";
import crypto from "crypto";
import { randomUUID } from "crypto";

const SANDBOX_BASE = "https://uatapi.cleanverse.com/api/cooperate";
const BASE    = process.env.CLEANVERSE_API_BASE || SANDBOX_BASE;
const APP_ID  = process.env.CLEANVERSE_APP_ID  || "";
const API_KEY = process.env.CLEANVERSE_API_KEY || "";

const MOCK = !APP_ID || !API_KEY;
if (MOCK) console.warn("[cleanverse] Mock mode — set CLEANVERSE_APP_ID + CLEANVERSE_API_KEY in .env");

// ─── AES-CBC encryption (fixed zero IV, api-key as key) ───────────────────────

function encryptBody(plainObj) {
  const key = Buffer.from(API_KEY, "base64");          // 32 bytes from base64
  const iv  = Buffer.alloc(16, 0);                     // 16 zero bytes — fixed
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const plainText = JSON.stringify(plainObj);
  const enc = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  return { data: enc.toString("base64") };
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  if (MOCK) return mockResponse(path, opts);

  const res  = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type":  "application/json",
      "api-id":        APP_ID,
      "X-Request-ID":  randomUUID(),
      ...(opts.headers || {}),
    },
  });
  return res.json().catch(() => ({}));
}

// ─── A-Pass: basic query ─────────────────────────────────────────────────────

/**
 * Query A-Pass basic info for a wallet address.
 * Returns { verified, apassId, tier, status, expirationTime }
 */
export async function verifyAPass(address, chain = "monad") {
  try {
    const res = await apiFetch("/query_apass", {
      method: "POST",
      body:   JSON.stringify({ chain, address }),
    });
    if (res.code !== "0000" || !res.data) {
      return { verified: false, apassId: null, error: res.message };
    }
    const d = res.data;
    const active = d.status === 1;
    return {
      verified:       active,
      apassId:        d.cvRecordId,
      tier:           d.tier,
      subTier:        d.subTier,
      group:          d.group,
      expirationTime: d.expirationTime,
      status:         d.status,
    };
  } catch (e) {
    console.error("[cleanverse] query_apass:", e.message);
    return { verified: MOCK, apassId: MOCK ? `cv_${address.slice(2,10)}` : null, error: e.message };
  }
}

// ─── A-Pass: verify for a specific A-Token ────────────────────────────────────

/**
 * Verify whether an address can receive/transfer a specific A-Token.
 * data.code 4 = success; 2 = no A-Pass; 3 = frozen/expired; 1 = token not found
 */
export async function verifyAPassForToken(address, atokenAddress, chain = "monad") {
  try {
    const res = await apiFetch("/verify_apass", {
      method: "POST",
      body:   JSON.stringify({ chain, atoken: atokenAddress, address }),
    });
    if (res.code !== "0000") return { verified: false, error: res.message };
    return {
      verified:   res.data?.code === 4,
      resultCode: res.data?.code,
      message:    res.data?.message,
      magickLink: res.data?.magickLink,
    };
  } catch (e) {
    console.error("[cleanverse] verify_apass:", e.message);
    return { verified: MOCK, resultCode: MOCK ? 4 : 0, error: e.message };
  }
}

// ─── Supported A-Tokens for a chain ──────────────────────────────────────────

/**
 * Returns list of { origin_token, atoken, accesscore_address, apass_address }
 * for the given chain. Use this to discover the monad aUSDC address.
 */
export async function getSupportedAtokens(chain = "monad") {
  try {
    const res = await apiFetch("/query_deposit_atoken_list", {
      method: "POST",
      body:   JSON.stringify({ chain }),
    });
    return res.code === "0000" ? (res.data?.tokens || []) : [];
  } catch (e) {
    console.error("[cleanverse] query_deposit_atoken_list:", e.message);
    return [];
  }
}

// ─── Validator: verify user against a registered compliance pool ──────────────

/**
 * Check if a user wallet satisfies the compliance rules of a registered pool
 * (e.g. PayHub's own contract registered with the Validator).
 * Returns { valid: bool }
 */
export async function validatorVerify(contractAddress, userAddress, chain = "monad") {
  try {
    const res = await apiFetch("/validator/verify", {
      method: "POST",
      body:   JSON.stringify({ chain, contract_address: contractAddress, user_address: userAddress }),
    });
    if (res.code !== "0000") return { valid: false, error: res.message };
    return { valid: res.data?.valid === true };
  } catch (e) {
    console.error("[cleanverse] validator/verify:", e.message);
    return { valid: MOCK, error: e.message };
  }
}

// ─── Travel Rule: download report URL for a tx ───────────────────────────────

/**
 * Returns { downloadUrl, fileName } for a transaction.
 * Use the on-chain txHash of the transfer or withdrawal.
 */
export async function downloadTravelRule({ txHash, walletAddress, chain = "monad", customerId, cvRecordId }) {
  try {
    const res = await apiFetch("/download_travel_rule", {
      method: "POST",
      body:   JSON.stringify({
        ...(customerId  ? { customerId }  : {}),
        ...(cvRecordId  ? { cvRecordId }  : {}),
        txHash,
        wallet: { chain, address: walletAddress },
      }),
    });
    if (res.code !== "0000") return { downloadUrl: null, error: res.message };
    return { downloadUrl: res.data?.downloadUrl, fileName: res.data?.fileName };
  } catch (e) {
    console.error("[cleanverse] download_travel_rule:", e.message);
    return { downloadUrl: null, error: e.message };
  }
}

// ─── Faucet: request test tokens ──────────────────────────────────────────────

export async function requestFaucet({ chain, symbol, depositAddress, amount }) {
  try {
    const res = await apiFetch("/faucet", {
      method: "POST",
      body:   JSON.stringify({ chain, symbol, depositAddress, amount: String(amount) }),
    });
    return res.code === "0000" ? { ok: true, txHash: res.data?.tx_hash } : { ok: false, error: res.message };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ─── Generate A-Pass (encrypted body) ────────────────────────────────────────

export async function generateAPass({ customerId, walletAddress, chain, expirationTime, identityDataList }) {
  const plain = {
    customerId,
    expirationTime: expirationTime || Math.floor(Date.now() / 1000) + 3 * 365 * 24 * 3600,
    wallet: { address: walletAddress, chain },
    ...(identityDataList ? { identityDataList } : {}),
  };
  try {
    const res = await apiFetch("/generate_apass", {
      method: "POST",
      body:   JSON.stringify(encryptBody(plain)),
    });
    return res.code === "0000" ? { ok: true, data: res.data } : { ok: false, error: res.message };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ─── CCP equivalent — combined A-Pass + token verification ───────────────────

/**
 * Pre-flight compliance check for a payment.
 * Verifies both payer and merchant A-Pass, then checks token transfer eligibility.
 * This is the PayHub equivalent of "CCP pre-check" using real Cleanverse primitives.
 */
export async function ccpPreCheck({ fromAddress, toAddress, atokenAddress, chain = "monad" }) {
  const [payerAPass, merchantAPass, payerToken, merchantToken] = await Promise.all([
    verifyAPass(fromAddress, chain),
    verifyAPass(toAddress,   chain),
    atokenAddress ? verifyAPassForToken(fromAddress, atokenAddress, chain) : Promise.resolve({ verified: true }),
    atokenAddress ? verifyAPassForToken(toAddress,   atokenAddress, chain) : Promise.resolve({ verified: true }),
  ]);

  const cleared = payerAPass.verified && merchantAPass.verified &&
                  payerToken.verified  && merchantToken.verified;
  const flags   = [];
  if (!payerAPass.verified)   flags.push("payer_no_apass");
  if (!merchantAPass.verified) flags.push("merchant_no_apass");
  if (!payerToken.verified)   flags.push("payer_token_blocked");
  if (!merchantToken.verified) flags.push("merchant_token_blocked");

  return {
    cleared,
    flags,
    riskScore:     cleared ? 2 : 80,
    payerAPass,
    merchantAPass,
  };
}

// ─── Mock fixtures ────────────────────────────────────────────────────────────

function mockResponse(path) {
  const ts = Date.now();
  if (path.includes("query_apass"))             return { code: "0000", data: { cvRecordId: `cv_${ts}`, tier: "3", subTier: 1, status: 1, expirationTime: 1863690034, group: "AA", subGroup: "AA" } };
  if (path.includes("verify_apass"))            return { code: "0000", data: { code: 4, message: "apass verify success (mock)" } };
  if (path.includes("query_deposit_atoken_list")) return { code: "0000", data: { chain: "monad", tokens: [{ origin_token: { address: "0x0000000000000000000000000000000000000001", symbol: "usdc", decimals: 6 }, atoken: { address: "0x0000000000000000000000000000000000000002", symbol: "ausdc", decimals: 6 }, accesscore_address: "0x0000000000000000000000000000000000000003" }] } };
  if (path.includes("validator/verify"))        return { code: "0000", data: { valid: true } };
  if (path.includes("download_travel_rule"))    return { code: "0000", data: { downloadUrl: `https://mock.cleanverse.com/tr/${ts}.pdf`, fileName: `travel_rule_${ts}.pdf` } };
  if (path.includes("faucet"))                  return { code: "0000", data: { tx_hash: `0x${"a".repeat(64)}` } };
  if (path.includes("generate_apass"))          return { code: "0000", data: { customerId: `mock_${ts}`, cvRecordId: `cv_${ts}` } };
  return { code: "0000", data: {} };
}
