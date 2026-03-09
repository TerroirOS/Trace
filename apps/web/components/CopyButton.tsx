"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        padding: "6px 14px",
        background: copied ? "rgba(45,90,39,0.1)" : "transparent",
        color: copied ? "#2D5A27" : "#4A5568",
        border: "1px solid",
        borderColor: copied ? "rgba(45,90,39,0.2)" : "rgba(74,85,104,0.2)",
        borderRadius: 8,
        fontSize: "0.82rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s"
      }}
    >
      {copied ? "Copied!" : "Copy Link"}
    </button>
  );
}
