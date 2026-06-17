"use client";
import { ShieldCheck, FileText, AlertTriangle, CheckCircle, ArrowDownToLine } from "lucide-react";

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-[var(--border)] last:border-0 text-sm">
      <span className="text-[var(--text-muted)] shrink-0">{label}</span>
      <span className="font-mono text-right break-all">{String(value ?? "—")}</span>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden mb-4">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-3)]">
        <Icon size={15} className="text-[var(--brand-light)]" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

export default function AuditReport({ bundle }) {
  if (!bundle) return null;

  const download = () => {
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `payhub-audit-${bundle.payment?.id?.slice(0, 10) || "report"}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const STATUS_COLOR = {
    REFUNDED: "text-blue-400", SETTLED: "text-green-400",
    DISPUTED: "text-red-400",  PENDING:  "text-yellow-400",
  };

  return (
    <div className="rounded-2xl border border-green-700/50 bg-green-900/10 p-6 mt-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <ShieldCheck size={20} className="text-green-400" />
          </div>
          <div>
            <p className="font-bold text-lg">Compliance Audit Report</p>
            <p className="text-xs text-[var(--text-muted)]">
              Generated {new Date(bundle.generated).toLocaleString()} · PayHub v{bundle.version}
            </p>
          </div>
        </div>
        <button onClick={download}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors">
          <ArrowDownToLine size={13} /> Download JSON
        </button>
      </div>

      {/* Payment */}
      <Section title="Payment" icon={FileText}>
        <Row label="Payment ID"    value={bundle.payment?.id} />
        <Row label="Order ID"      value={bundle.payment?.orderId} />
        <Row label="Status"        value={<span className={STATUS_COLOR[bundle.payment?.status]}>{bundle.payment?.status}</span>} />
        <Row label="Amount"        value={bundle.payment?.amount} />
        <Row label="Token"         value={bundle.payment?.token} />
        <Row label="Created"       value={bundle.payment?.createdAt} />
        <Row label="Finality by"   value={bundle.payment?.finalityDeadline} />
        <Row label="Payer"         value={bundle.payment?.payer} />
        <Row label="Merchant"      value={bundle.payment?.merchant} />
      </Section>

      {/* Identity */}
      <Section title="Identity (Cleanverse A-Pass)" icon={ShieldCheck}>
        <div className="flex items-center gap-2 mb-3 text-sm text-green-300">
          <CheckCircle size={14} /> Both parties verified via Cleanverse A-Pass
        </div>
        <Row label="Payer A-Pass ID"    value={bundle.identity?.payerAPass} />
        <Row label="Merchant A-Pass ID" value={bundle.identity?.merchantAPass} />
      </Section>

      {/* Compliance */}
      <Section title="Compliance (CCP + Travel Rule)" icon={ShieldCheck}>
        {bundle.compliance?.ccpPayment && (
          <>
            <p className="text-xs text-[var(--text-muted)] mb-1 font-semibold">Payment leg screening</p>
            <Row label="Result"     value={bundle.compliance.ccpPayment.cleared ? "✅ CLEARED" : "❌ BLOCKED"} />
            <Row label="Risk score" value={bundle.compliance.ccpPayment.riskScore} />
          </>
        )}
        {bundle.compliance?.ccpRefund && (
          <>
            <p className="text-xs text-[var(--text-muted)] mb-1 mt-3 font-semibold">Refund leg screening</p>
            <Row label="Result"     value={bundle.compliance.ccpRefund.cleared ? "✅ CLEARED" : "❌ BLOCKED"} />
            <Row label="Risk score" value={bundle.compliance.ccpRefund.riskScore} />
          </>
        )}
        {bundle.compliance?.travelRule?.length > 0 && (
          <>
            <p className="text-xs text-[var(--text-muted)] mb-1 mt-3 font-semibold">Travel Rule IDs</p>
            {bundle.compliance.travelRule.map((id) => (
              <Row key={id} label="TR Ref" value={id} />
            ))}
          </>
        )}
        <p className="text-xs text-[var(--text-muted)] mt-3">{bundle.compliance?.note}</p>
      </Section>

      {/* Dispute */}
      {bundle.dispute && (
        <Section title="Dispute Record" icon={AlertTriangle}>
          <Row label="Reason"              value={bundle.dispute.reason} />
          <Row label="Opened at"           value={bundle.dispute.openedAt} />
          <Row label="Merchant responded"  value={bundle.dispute.merchantResponded ? "Yes" : "No"} />
          {bundle.dispute.merchantEvidence && <Row label="Merchant evidence" value={bundle.dispute.merchantEvidence} />}
          <Row label="Response deadline"   value={bundle.dispute.responseDeadline} />
        </Section>
      )}

      {/* Resolution */}
      {bundle.resolution && (
        <Section title="Resolution" icon={CheckCircle}>
          <Row label="Verdict"        value={bundle.resolution.verdict} />
          <Row label="In favour of"   value={bundle.resolution.inFavorOfPayer ? "Customer (payer)" : "Merchant"} />
          <Row label="Resolved at"    value={bundle.resolution.resolvedAt} />
          <Row label="Tx hash"        value={bundle.resolution.txHash} />
        </Section>
      )}

      {/* Refund */}
      {bundle.refund && (
        <Section title="Refund" icon={CheckCircle}>
          <div className="flex items-center gap-2 text-sm text-blue-300 mb-2">
            <CheckCircle size={14} /> Refund-to-source enforced — funds returned to original verified wallet only
          </div>
          <Row label="Refund destination" value={bundle.refund.destination} />
        </Section>
      )}

      {/* Signature */}
      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-3)] px-4 py-3 text-xs font-mono break-all">
        <span className="text-[var(--text-muted)]">HMAC-SHA256 signature: </span>
        <span className="text-green-300">{bundle.signature}</span>
      </div>
    </div>
  );
}
