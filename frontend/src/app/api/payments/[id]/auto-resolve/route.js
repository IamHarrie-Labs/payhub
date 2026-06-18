export const runtime = "nodejs";
import { autoResolveExpired } from "@/lib/server/chain";

export async function POST(_req, { params }) {
  try {
    const { id } = await params;
    const result = await autoResolveExpired(id);
    return Response.json({ ok: true, txHash: result.txHash });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
