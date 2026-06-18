export const runtime = "nodejs";
import store from "@/lib/server/store";
import { getPayment, getDispute, arbiterResolve } from "@/lib/server/chain";
import { ccpPreCheck, downloadTravelRule } from "@/lib/server/cleanverse";
import { buildAuditBundle } from "@/lib/server/audit";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { inFavorOfPayer, verdict, authToken } = await request.json();
    if (authToken !== process.env.ARBITER_AUTH_TOKEN)
      return Response.json({ error: "Unauthorized" }, { status: 401 });

    const onChain = await getPayment(id).catch(() => null);
    if (!onChain) return Response.json({ error: "Payment not found" }, { status: 404 });

    let ccpRefund = null;
    if (inFavorOfPayer) {
      ccpRefund = await ccpPreCheck({
        fromAddress:   process.env.PAYHUB_CONTRACT_ADDRESS || "0x",
        toAddress:     onChain.payer,
        atokenAddress: onChain.token,
      });
      if (!ccpRefund.cleared)
        return Response.json({ error: "Refund blocked by CCP check", flags: ccpRefund.flags }, { status: 403 });
    }

    const result  = await arbiterResolve(id, inFavorOfPayer, verdict);
    const meta    = store.payments[id] || {};
    const dispute = await getDispute(id).catch(() => null);

    let trReport = null;
    if (meta.txHash) {
      trReport = await downloadTravelRule({ txHash: meta.txHash, walletAddress: onChain.payer });
    }

    const audit = buildAuditBundle({
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

    return Response.json({ ok: true, txHash: result.txHash, audit });
  } catch (e) {
    console.error("[resolve]", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
