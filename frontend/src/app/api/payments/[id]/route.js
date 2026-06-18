export const runtime = "nodejs";
import store from "@/lib/server/store";
import { getPayment } from "@/lib/server/chain";

const STATUS_MAP = ["PENDING", "SETTLED", "DISPUTED", "REFUNDED"];

export async function GET(_req, { params }) {
  try {
    const { id } = await params;
    const [onChain, meta] = await Promise.all([
      getPayment(id).catch(() => null),
      Promise.resolve(store.payments[id] || null),
    ]);
    if (!onChain && !meta) return Response.json({ error: "Payment not found" }, { status: 404 });
    return Response.json({
      paymentId: id,
      ...(meta || {}),
      onChain: onChain ? {
        payer:    onChain.payer,
        merchant: onChain.merchant,
        amount:   onChain.amount?.toString(),
        status:   STATUS_MAP[onChain.status] || String(onChain.status),
        createdAt: onChain.createdAt?.toString(),
        apassPayer:    onChain.apassPayer,
        apassMerchant: onChain.apassMerchant,
      } : null,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
