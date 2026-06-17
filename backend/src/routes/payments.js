import { Router } from "express";
import { v4 as uuid } from "uuid";
import {
  verifyAPass,
  verifyAPassForToken,
  ccpPreCheck,
  downloadTravelRule,
} from "../cleanverse.js";
import { getPayment, getDispute, arbiterResolve, autoResolveExpired } from "../chain.js";
import { buildAuditBundle } from "../audit.js";

const router = Router();

// In-memory store (replace with DB for production)
const store = { payments: {}, disputes: {}, audits: {} };

// ─── POST /payments/preflight ─────────────────────────────────────────────────
// Full Cleanverse compliance check before the frontend submits any on-chain tx.
router.post("/preflight", async (req, res) => {
  try {
    const { payerAddress, merchantAddress, amount, asset, orderId } = req.body;
    if (!payerAddress || !merchantAddress || !amount || !asset)
      return res.status(400).json({ error: "Missing required fields" });

    // 1. A-Pass basic check — both parties must be verified and active
    const [payerPass, merchantPass] = await Promise.all([
      verifyAPass(payerAddress),
      verifyAPass(merchantAddress),
    ]);
    if (!payerPass.verified)
      return res.status(403).json({ error: "Payer does not hold a valid A-Pass", detail: payerPass });
    if (!merchantPass.verified)
      return res.status(403).json({ error: "Merchant does not hold a valid A-Pass", detail: merchantPass });

    // 2. Combined CCP — verify A-Pass + A-Token transfer eligibility for both parties
    const ccp = await ccpPreCheck({
      fromAddress:   payerAddress,
      toAddress:     merchantAddress,
      atokenAddress: asset,       // verify both can transact this A-Token
    });
    if (!ccp.cleared)
      return res.status(403).json({ error: "Payment blocked by compliance check", flags: ccp.flags });

    res.json({
      cleared:       true,
      apassPayer:    payerPass.apassId,
      apassMerchant: merchantPass.apassId,
      ccpRiskScore:  ccp.riskScore,
      payerTier:     payerPass.tier,
      merchantTier:  merchantPass.tier,
      // Travel Rule: no pre-attach in v5 — report is downloaded by tx hash after settlement
      travelRuleId:  `tr_pre_${uuid()}`,
    });
  } catch (e) {
    console.error("[preflight]", e);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /payments/register ──────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const {
      paymentId, orderId, payerAddress, merchantAddress, amount, asset,
      apassPayer, apassMerchant, travelRuleId, txHash,
    } = req.body;
    if (!paymentId) return res.status(400).json({ error: "paymentId required" });

    store.payments[paymentId] = {
      paymentId, orderId, payerAddress, merchantAddress, amount, asset,
      apassPayer, apassMerchant, travelRuleId, txHash,
      registeredAt: new Date().toISOString(),
    };
    res.json({ ok: true, paymentId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /payments/:id ────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [onChain, meta] = await Promise.all([
      getPayment(id).catch(() => null),
      Promise.resolve(store.payments[id] || null),
    ]);
    if (!onChain && !meta) return res.status(404).json({ error: "Payment not found" });

    const STATUS_MAP = ["PENDING", "SETTLED", "DISPUTED", "REFUNDED"];
    res.json({
      paymentId: id,
      ...(meta || {}),
      onChain: onChain ? {
        payer:    onChain.payer,
        merchant: onChain.merchant,
        amount:   onChain.amount?.toString(),
        status:   STATUS_MAP[onChain.status] || String(onChain.status),
        createdAt: onChain.createdAt?.toString(),
      } : null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /payments/:id/dispute/preflight ────────────────────────────────────
// Verify the caller is the A-Pass-verified original payer before submitting the tx.
router.post("/:id/dispute/preflight", async (req, res) => {
  try {
    const { id } = req.params;
    const { callerAddress } = req.body;

    const onChain = await getPayment(id).catch(() => null);
    if (!onChain) return res.status(404).json({ error: "Payment not found" });

    const STATUS_MAP = ["PENDING", "SETTLED", "DISPUTED", "REFUNDED"];
    if (STATUS_MAP[onChain.status] !== "PENDING")
      return res.status(400).json({ error: `Payment is ${STATUS_MAP[onChain.status]}, cannot dispute` });

    // Identity-bound recourse: only the original verified payer can dispute
    if (onChain.payer.toLowerCase() !== callerAddress?.toLowerCase())
      return res.status(403).json({ error: "Only the original payer can open a dispute" });

    // Re-verify A-Pass at dispute time
    const pass = await verifyAPass(callerAddress);
    if (!pass.verified)
      return res.status(403).json({ error: "Caller A-Pass identity could not be verified" });

    const createdAt  = Number(onChain.createdAt);
    const dispWindow = Number(onChain.disputeWindow);
    const now        = Math.floor(Date.now() / 1000);
    if (now > createdAt + dispWindow)
      return res.status(400).json({ error: "Dispute window has closed" });

    res.json({
      eligible:       true,
      apassId:        pass.apassId,
      tier:           pass.tier,
      windowClosesAt: new Date((createdAt + dispWindow) * 1000).toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /payments/:id/dispute/register ─────────────────────────────────────
router.post("/:id/dispute/register", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, txHash } = req.body;
    store.disputes[id] = { reason, txHash, openedAt: new Date().toISOString() };
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /payments/:id/resolve ───────────────────────────────────────────────
// Arbiter resolves — runs CCP (A-Pass + A-Token check) on refund leg first.
router.post("/:id/resolve", async (req, res) => {
  try {
    const { id } = req.params;
    const { inFavorOfPayer, verdict, authToken } = req.body;

    if (authToken !== process.env.ARBITER_AUTH_TOKEN)
      return res.status(401).json({ error: "Unauthorized" });

    const onChain = await getPayment(id).catch(() => null);
    if (!onChain) return res.status(404).json({ error: "Payment not found" });

    // Dual-leg CCP: screen the refund leg before executing on-chain
    let ccpRefund = null;
    if (inFavorOfPayer) {
      ccpRefund = await ccpPreCheck({
        fromAddress:   process.env.PAYHUB_CONTRACT_ADDRESS || "0x",
        toAddress:     onChain.payer,
        atokenAddress: onChain.token,
      });
      if (!ccpRefund.cleared)
        return res.status(403).json({ error: "Refund blocked by CCP check", flags: ccpRefund.flags });
    }

    // Submit on-chain
    const result = await arbiterResolve(id, inFavorOfPayer, verdict);

    // Fetch Travel Rule report URL for the original payment tx (best-effort)
    const meta    = store.payments[id] || {};
    let trReport  = null;
    if (meta.txHash) {
      trReport = await downloadTravelRule({
        txHash:        meta.txHash,
        walletAddress: onChain.payer,
      });
    }

    // Build signed audit bundle
    const dispute = await getDispute(id).catch(() => null);
    const audit   = buildAuditBundle({
      paymentId:     id,
      orderId:       meta.orderId      || onChain.orderId,
      payer:         onChain.payer,
      merchant:      onChain.merchant,
      apassPayer:    onChain.apassPayer,
      apassMerchant: onChain.apassMerchant,
      amount:        onChain.amount,
      token:         onChain.token,
      status:        inFavorOfPayer ? "REFUNDED" : "SETTLED",
      createdAt:     onChain.createdAt,
      dispute:       dispute || store.disputes[id] || null,
      ccpResults:    { refund: ccpRefund },
      travelRule:    { id: meta.travelRuleId, reportUrl: trReport?.downloadUrl },
      resolution:    { verdict, inFavorOfPayer, txHash: result.txHash, resolvedAt: new Date().toISOString() },
    });
    store.audits[id] = audit;

    res.json({ ok: true, txHash: result.txHash, audit });
  } catch (e) {
    console.error("[resolve]", e);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /payments/:id/auto-resolve ─────────────────────────────────────────
router.post("/:id/auto-resolve", async (req, res) => {
  try {
    const result = await autoResolveExpired(req.params.id);
    res.json({ ok: true, txHash: result.txHash });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /payments/:id/audit ──────────────────────────────────────────────────
router.get("/:id/audit", (req, res) => {
  const audit = store.audits[req.params.id];
  if (!audit) return res.status(404).json({ error: "Audit bundle not yet generated" });
  res.json(audit);
});

export default router;
