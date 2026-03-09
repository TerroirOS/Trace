"use client";

import { useEffect, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChainTransactionView } from "../lib/api";

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  QUEUED: { color: "#4A5568", bg: "rgba(74,85,104,0.1)" },
  SUBMITTED: { color: "#C4A235", bg: "rgba(196,162,53,0.12)" },
  CONFIRMED: { color: "#2D5A27", bg: "rgba(45,90,39,0.1)" },
  FAILED: { color: "#9B3A47", bg: "rgba(212,131,143,0.12)" }
};

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function ChainMonitor({ txs }: { txs: ChainTransactionView[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const pendingCount = txs.filter(
    (t) => t.status === "QUEUED" || t.status === "SUBMITTED"
  ).length;
  const failedCount = txs.filter((t) => t.status === "FAILED").length;

  // Auto-refresh every 30s if there are pending transactions
  useEffect(() => {
    if (pendingCount === 0) return;
    const id = setInterval(() => {
      startTransition(() => router.refresh());
    }, 30_000);
    return () => clearInterval(id);
  }, [pendingCount, router]);

  const recentTxs = txs.slice(0, 10);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(74,85,104,0.12)",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(26,26,46,0.04)"
      }}
    >
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 20px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: "1.05rem"
            }}
          >
            Chain Monitor
          </h2>
          {pendingCount > 0 && (
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: "0.74rem",
                fontWeight: 700,
                background: "rgba(196,162,53,0.15)",
                color: "#C4A235"
              }}
            >
              {pendingCount} pending
            </span>
          )}
          {failedCount > 0 && (
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: "0.74rem",
                fontWeight: 700,
                background: "rgba(212,131,143,0.12)",
                color: "#9B3A47"
              }}
            >
              {failedCount} failed
            </span>
          )}
        </div>
        <span style={{ color: "#4A5568", fontSize: "0.82rem", fontWeight: 600 }}>
          {open ? "Hide" : "Show"} &nbsp;
          <span style={{ fontFamily: "monospace" }}>{open ? "▲" : "▼"}</span>
        </span>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid rgba(74,85,104,0.08)", padding: "12px 20px 16px" }}>
          {recentTxs.length === 0 ? (
            <p style={{ margin: 0, color: "#4A5568", fontSize: "0.9rem" }}>
              No blockchain transactions yet. Events will be queued here when the NestJS API is running.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {recentTxs.map((tx) => {
                const style = STATUS_COLORS[tx.status] ?? STATUS_COLORS.QUEUED;
                return (
                  <div
                    key={tx.txId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      background: "#FAF9F6",
                      border: "1px solid rgba(74,85,104,0.1)",
                      borderRadius: 8,
                      fontSize: "0.84rem",
                      flexWrap: "wrap",
                      gap: 6
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: style.color,
                          background: style.bg
                        }}
                      >
                        {tx.status}
                      </span>
                      <code style={{ fontSize: "0.78rem", color: "#4A5568" }}>
                        {tx.eventId.slice(0, 20)}…
                      </code>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {tx.txHash && (
                        <a
                          href={`https://amoy.polygonscan.com/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#2D5A27", fontSize: "0.78rem", textDecoration: "underline" }}
                        >
                          Polygonscan
                        </a>
                      )}
                      <span style={{ color: "#A0AEC0", fontSize: "0.78rem" }}>
                        {formatDateTime(tx.updatedAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {pendingCount > 0 && (
            <p style={{ margin: "10px 0 0", color: "#A0AEC0", fontSize: "0.78rem" }}>
              Auto-refreshing every 30s while transactions are pending.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
