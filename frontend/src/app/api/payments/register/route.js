export const runtime = "nodejs";
import store from "@/lib/server/store";

export async function POST(request) {
  try {
    const body = await request.json();
    const { paymentId } = body;
    if (!paymentId) return Response.json({ error: "paymentId required" }, { status: 400 });
    store.payments[paymentId] = { ...body, registeredAt: new Date().toISOString() };
    return Response.json({ ok: true, paymentId });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
