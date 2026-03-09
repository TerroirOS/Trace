import { createIssuer } from "../../../../lib/actions";
import Button from "../../../../components/Button";
import CreateIssuerForm from "../../../../components/CreateIssuerForm";

export default function NewIssuerPage() {
  return (
    <main
      style={{
        minHeight: "calc(100vh - 64px)",
        padding: "32px 20px 56px",
        background:
          "radial-gradient(70rem 28rem at 100% -10%, rgba(196,162,53,0.06), transparent 50%), linear-gradient(180deg, #FAF9F6, #F0EDE6)"
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <Button href="/portal/issuer" variant="ghost" size="sm">
            &larr; Back to Issuers
          </Button>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(74,85,104,0.12)",
            borderRadius: 16,
            padding: 32,
            boxShadow: "0 4px 16px rgba(26,26,46,0.06)"
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#C4A235",
              fontWeight: 700
            }}
          >
            Issuer Portal
          </p>
          <h1
            style={{
              margin: "6px 0 4px",
              fontFamily: "var(--font-serif)",
              fontSize: "1.6rem"
            }}
          >
            Register Issuer
          </h1>
          <p style={{ margin: "0 0 24px", color: "#4A5568", fontSize: "0.9rem" }}>
            Add a trusted organization that can attest to batch events.
          </p>
          <CreateIssuerForm action={createIssuer} />
        </div>
      </div>
    </main>
  );
}
