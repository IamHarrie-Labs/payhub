import crypto from "crypto";

const SIGNING_SECRET = process.env.AUDIT_SIGNING_SECRET || "payhub_audit_secret_change_me";

export function buildAuditBundle({
  paymentId, orderId, payer, merchant, apassPayer, apassMerchant,
  amount, token, status, createdAt, dispute, ccpResults, travelRule, resolution,
}) {
  const bundle = {
    version:   "1.0",
    generated: new Date().toISOString(),
    payment: {
      id: paymentId, orderId, payer, merchant,
      amount: String(amount), token, status,
      createdAt: new Date(Number(createdAt) * 1000).toISOString(),
    },
    identity: {
      payerAPass:    apassPayer,
      merchantAPass: apassMerchant,
      note: "Both parties verified via Cleanverse A-Pass before payment initiation.",
    },
    compliance: {
      ccpPayment: ccpResults?.payment || null,
      ccpRefund:  ccpResults?.refund  || null,
      travelRule: travelRule ? [travelRule.id] : [],
      travelRuleReportUrl: travelRule?.reportUrl || null,
      note: "CCP AML/sanctions screening applied to both payment and refund legs.",
    },
    dispute: dispute ? {
      reason:            dispute.reason,
      openedAt:          dispute.openedAt ? new Date(Number(dispute.openedAt) * 1000).toISOString() : null,
      merchantResponded: dispute.merchantResponded ?? false,
      merchantEvidence:  dispute.merchantEvidence  || null,
    } : null,
    resolution: resolution || null,
    refund: status === "REFUNDED" ? {
      destination: payer,
      note: "Refund issued to originating verified wallet only (refund-to-source).",
    } : null,
  };

  const canonical = JSON.stringify(bundle, Object.keys(bundle).sort());
  bundle.signature = crypto.createHmac("sha256", SIGNING_SECRET).update(canonical).digest("hex");
  return bundle;
}
