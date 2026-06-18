export const runtime = "nodejs";
import store from "@/lib/server/store";

export async function GET(_req, { params }) {
  const { id } = await params;
  const audit = store.audits[id];
  if (!audit) return Response.json({ error: "Audit bundle not yet generated" }, { status: 404 });
  return Response.json(audit);
}
