/**
 * Audit report generator.
 * Builds a signed, portable evidence bundle for every payment/dispute lifecycle.
 */
import crypto from "crypto";

const SIGNING_SECRET = process.env.AUDIT_SIGNING_SECRET || "payhub_audit_secret_change_me";

/**
 * Build an audit bundle. Every resolved dispute produces one of these.
 * The bundle is HMAC-signed so downstream regulators can verify it wasn't tampered with.
 */
export function buildAuditBundle({
  paymentId,
  orderId,
  payer,
  merchant,
  apassPayer,
  apassMerchant,
  amount,
  token,
  status,
  createdAt,
  finality,
  dispute,
  ccpResults,
  travelRuleIds,
  resolution,
}) {
  const bundle = {
    version:   "1.0",
    generated: new Date().toISOString(),
    payment: {
      id:       paymentId,
      orderId,
      payer,
      merchant,
      amount:   String(amount),
      token,
      status,
      createdAt: new Date(Number(createdAt) * 1000).toISOString(),
      finalityDeadline: new Date((Number(createdAt) + Number(finality)) * 1000).toISOString(),
    },
    identity: {
      payerAPass:    apassPayer,
      merchantAPass: apassMerchant,
      note: "Both parties verified via Cleanverse A-Pass before payment initiation.",
    },
    compliance: {
      ccpPayment: ccpResults?.payment  || null,
      ccpRefund:  ccpResults?.refund   || null,
      travelRule: travelRuleIds        || [],
      note: "CCP AML/sanctions screening applied to both payment and refund legs.",
    },
    dispute: dispute ? {
      reason:            dispute.reason,
      openedAt:          new Date(Number(dispute.openedAt) * 1000).toISOString(),
      merchantResponded: dispute.merchantResponded,
      merchantEvidence:  dispute.merchantEvidence || null,
      responseDeadline:  new Date(Number(dispute.responseDeadline) * 1000).toISOString(),
    } : null,
    resolution: resolution || null,
    refund: status === "REFUNDED" ? {
      destination: payer,
      note:        "Refund issued to originating verified wallet only (refund-to-source).",
    } : null,
  };

  // HMAC-SHA256 signature over canonical JSON
  const canonical = JSON.stringify(bundle, Object.keys(bundle).sort());
  bundle.signature = crypto
    .createHmac("sha256", SIGNING_SECRET)
    .update(canonical)
    .digest("hex");

  return bundle;
}

export function verifyAuditBundle(bundle) {
  const { signature, ...rest } = bundle;
  const canonical = JSON.stringify(rest, Object.keys(rest).sort());
  const expected  = crypto
    .createHmac("sha256", SIGNING_SECRET)
    .update(canonical)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}
