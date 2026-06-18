export const runtime = "nodejs";
export function GET() {
  return Response.json({ ok: true, service: "PayHub API", version: "1.0.0" });
}
