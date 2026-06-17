"use client";
import StatusBadge from "./StatusBadge";
import { ethers } from "ethers";
import { Clock, User, Store } from "lucide-react";

export default function PaymentCard({ payment, onClick }) {
  const { onChain, orderId, paymentId } = payment;
  if (!onChain) return null;

  const amount  = onChain.amount ? ethers.formatUnits(onChain.amount, 6) : "—";
  const created = onChain.createdAt
    ? new Date(Number(onChain.createdAt) * 1000).toLocaleString()
    : "—";

  return (
    <button onClick={onClick}
      className="w-full text-left rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">{orderId || "Order"}</p>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">{paymentId?.slice(0, 20)}…</p>
        </div>
        <StatusBadge status={onChain.status} />
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1"><User size={12} />{onChain.payer?.slice(0,8)}…</span>
        <span className="flex items-center gap-1"><Store size={12} />{onChain.merchant?.slice(0,8)}…</span>
        <span className="flex items-center gap-1"><Clock size={12} />{created}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">{amount} <span className="text-xs font-normal text-[var(--text-muted)]">A-Token</span></span>
        <span className="text-xs text-[var(--brand-light)]">View details →</span>
      </div>
    </button>
  );
}
