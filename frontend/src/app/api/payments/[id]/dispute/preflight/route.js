export const runtime = "nodejs";
import { getPayment } from "@/lib/server/chain";
import { verifyAPass } from "@/lib/server/cleanverse";

const STATUS_MAP = ["PENDING", "SETTLED", "DISPUTED", "REFUNDED"];

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { callerAddress } = await request.json();
    const onChain = await getPayment(id).catch(() => null);
    if (!onChain) return Response.json({ error: "Payment not found" }, { status: 404 });

    const status = STATUS_MAP[onChain.status];
    if (status !== "PENDING")
      return Response.json({ error: `Payment is ${status}, cannot dispute` }, { status: 400 });
    if (onChain.payer.toLowerCase() !== callerAddress?.toLowerCase())
      return Response.json({ error: "Only the original payer can open a dispute" }, { status: 403 });

    const pass = await verifyAPass(callerAddress);
    if (!pass.verified)
      return Response.json({ error: "Caller A-Pass identity could not be verified" }, { status: 403 });

    const now        = Math.floor(Date.now() / 1000);
    const createdAt  = Number(onChain.createdAt);
    const dispWindow = Number(onChain.disputeWindow);
    if (now > createdAt + dispWindow)
      return Response.json({ error: "Dispute window has closed" }, { status: 400 });

    return Response.json({
      eligible:       true,
      apassId:        pass.apassId,
      tier:           pass.tier,
      windowClosesAt: new Date((createdAt + dispWindow) * 1000).toISOString(),
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
