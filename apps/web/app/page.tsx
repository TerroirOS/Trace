import Image from "next/image";
import Button from "../components/Button";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px",
        background:
          "radial-gradient(80rem 36rem at 50% -20%, rgba(45,90,39,0.08), transparent 60%), linear-gradient(180deg, #FAF9F6 0%, #F0EDE6 100%)",
        textAlign: "center"
      }}
    >
      <Image
        src="/logo.png"
        alt="TerroirOS Trace"
        width={88}
        height={93}
        style={{
          marginBottom: 20
        }}
        priority
      />

      <p
        style={{
          margin: 0,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: "#2D5A27",
          fontWeight: 700
        }}
      >
        TerroirOS Trace
      </p>

      <h1
        style={{
          fontFamily: "var(--font-serif, Georgia, serif)",
          fontSize: "clamp(2rem, 5vw, 3.2rem)",
          fontWeight: 600,
          color: "#1A1A2E",
          margin: "12px 0 16px",
          lineHeight: 1.15,
          maxWidth: 640
        }}
      >
        Open provenance for trusted origin.
      </h1>

      <p
        style={{
          maxWidth: 520,
          margin: "0 0 32px",
          fontSize: 16,
          lineHeight: 1.7,
          color: "#4A5568"
        }}
      >
        Create batch records, attach signed attestations, anchor
        tamper-evident hashes on-chain, and generate public QR
        verification pages — all open-source.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Button href="/portal/producer" variant="primary" size="lg">
          Open Dashboard
        </Button>
        <Button href="/portal/issuer" variant="secondary" size="lg">
          Issuer Portal
        </Button>
        <Button href="/verify/demo-batch-001" variant="ghost" size="lg">
          Verify a Batch
        </Button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 20,
          maxWidth: 800,
          marginTop: 60,
          width: "100%"
        }}
      >
        {[
          {
            title: "Producer Profiles",
            desc: "Create and manage winery or producer identities with verifiable credentials."
          },
          {
            title: "Batch Records",
            desc: "Track each lot from harvest through processing, bottling, and distribution."
          },
          {
            title: "Signed Attestations",
            desc: "Labs, certifiers, and inspectors confirm claims with cryptographic signatures."
          },
          {
            title: "Public Verification",
            desc: "QR-code-driven public pages that anyone can scan to verify origin and integrity."
          },
          {
            title: "Chain Anchoring",
            desc: "Tamper-evident hashes anchored on Polygon for immutable proof of provenance."
          }
        ].map((card) => (
          <div
            key={card.title}
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(74,85,104,0.10)",
              borderRadius: 12,
              padding: "24px 20px",
              textAlign: "left",
              boxShadow: "0 2px 8px rgba(26,26,46,0.04)"
            }}
          >
            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#2D5A27",
                margin: "0 0 8px"
              }}
            >
              {card.title}
            </h3>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                color: "#4A5568",
                margin: 0
              }}
            >
              {card.desc}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
