export const runtime = "nodejs";
import store from "@/lib/server/store";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { reason, txHash } = await request.json();
    store.disputes[id] = { reason, txHash, openedAt: new Date().toISOString() };
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
