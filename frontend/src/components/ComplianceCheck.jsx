"use client";
import { CheckCircle, XCircle, Loader } from "lucide-react";

/**
 * Animated checklist that shows the Cleanverse compliance pipeline:
 * A-Pass → Blacklist → CCP → Travel Rule
 */
export default function ComplianceCheck({ steps }) {
  return (
    <div className="space-y-2 my-4 text-sm">
      {steps.map((step) => (
        <div key={step.label} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5">
          {step.status === "done"    && <CheckCircle size={16} className="text-green-400 shrink-0" />}
          {step.status === "error"   && <XCircle     size={16} className="text-red-400   shrink-0" />}
          {step.status === "pending" && <Loader      size={16} className="text-[var(--text-muted)] shrink-0 animate-spin" />}
          {step.status === "wait"    && <div className="w-4 h-4 rounded-full border border-[var(--border)] shrink-0" />}
          <div className="flex-1">
            <span className={step.status === "done" ? "text-green-300" : step.status === "error" ? "text-red-300" : "text-[var(--text-muted)]"}>
              {step.label}
            </span>
            {step.detail && <p className="text-xs text-[var(--text-muted)] mt-0.5">{step.detail}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
