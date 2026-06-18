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

    // A-Pass registration is advisory on testnet — unregistered wallets are flagged, not blocked.
    const apassFlags = [];
    if (!payerPass.verified)    apassFlags.push("payer_apass_advisory");
    if (!merchantPass.verified) apassFlags.push("merchant_apass_advisory");

    const ccp = await ccpPreCheck({ fromAddress: payerAddress, toAddress: merchantAddress, atokenAddress: asset });

    return Response.json({
      cleared:       true,
      apassPayer:    payerPass.apassId    || payerAddress.toLowerCase(),
      apassMerchant: merchantPass.apassId || merchantAddress.toLowerCase(),
      ccpRiskScore:  ccp.riskScore,
      payerTier:     payerPass.tier    || "testnet",
      merchantTier:  merchantPass.tier || "testnet",
      flags:         [...apassFlags, ...ccp.flags],
      travelRuleId:  `tr_pre_${crypto.randomUUID()}`,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
