export const runtime = "nodejs";
import { verifyAPass, ccpPreCheck } from "@/lib/server/cleanverse";
import crypto from "crypto";

export async function POST(request) {
  try {
    const { payerAddress, merchantAddress, amount, asset, orderId } = await request.json();
    if (!payerAddress || !merchantAddress || !amount || !asset)
      return Response.json({ error: "Missing required fields" }, { status: 400 });

    const [payerPass, merchantPass] = await Promise.all([
      verifyAPass(payerAddress),
      verifyAPass(merchantAddress),
    ]);
    if (!payerPass.verified)
      return Response.json({ error: "Payer does not hold a valid A-Pass", detail: payerPass }, { status: 403 });
    if (!merchantPass.verified)
      return Response.json({ error: "Merchant does not hold a valid A-Pass", detail: merchantPass }, { status: 403 });

    const ccp = await ccpPreCheck({ fromAddress: payerAddress, toAddress: merchantAddress, atokenAddress: asset });
    if (!ccp.cleared)
      return Response.json({ error: "Payment blocked by compliance check", flags: ccp.flags }, { status: 403 });

    return Response.json({
      cleared:       true,
      apassPayer:    payerPass.apassId,
      apassMerchant: merchantPass.apassId,
      ccpRiskScore:  ccp.riskScore,
      payerTier:     payerPass.tier,
      merchantTier:  merchantPass.tier,
      travelRuleId:  `tr_pre_${crypto.randomUUID()}`,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
