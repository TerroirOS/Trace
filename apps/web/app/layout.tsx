import type { ReactNode } from "react";
import Image from "next/image";
import "./styles.css";
import Button from "../components/Button";

export const metadata = {
  title: "TerroirOS Trace",
  description:
    "Open-source provenance operating system for agricultural products. Tamper-evident traceability, signed attestations, and public verification.",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 24px",
            background:
              "linear-gradient(180deg, #FAF9F6 0%, #FAF9F6 100%)",
            boxShadow: "0 1px 4px rgba(26,26,46,0.06)",
            position: "sticky",
            top: 0,
            zIndex: 50
          }}
        >
          <a
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "#1A1A2E"
            }}
          >
            <Image
              src="/logo.png"
              alt="TerroirOS Trace"
              width={30}
              height={32}
              priority
            />
            <span
              style={{
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: "0.02em"
              }}
            >
              TerroirOS Trace
            </span>
          </a>
          <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button href="/dashboard" variant="ghost" size="sm">
              Overview
            </Button>
            <Button href="/portal/producer" variant="ghost" size="sm">
              Producer
            </Button>
            <Button href="/portal/issuer" variant="ghost" size="sm">
              Issuers
            </Button>
            <Button
              href="/portal/producer/batch/new"
              variant="secondary"
              size="sm"
            >
              + New Batch
            </Button>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
