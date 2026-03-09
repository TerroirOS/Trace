"use client";

import { Suspense } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import {
  loginAsDevSuperadmin,
  sendMagicLink
} from "../../../lib/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        width: "100%",
        padding: "12px 0",
        background: pending ? "rgba(45,90,39,0.5)" : "#2D5A27",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        fontSize: "0.95rem",
        fontWeight: 700,
        cursor: pending ? "not-allowed" : "pointer",
        letterSpacing: "0.02em",
        transition: "background 0.2s"
      }}
    >
      {pending ? "Sending…" : "Send Magic Link"}
    </button>
  );
}

function LoginPageContent() {
  const [state, action] = useFormState(sendMagicLink, null);
  const [bypassState, bypassAction] = useFormState(loginAsDevSuperadmin, null);
  const searchParams = useSearchParams();
  const devBypassEnabled =
    process.env.NEXT_PUBLIC_DEV_SUPERADMIN_BYPASS === "true";
  const callbackError = searchParams.get("error");
  const nextPath = searchParams.get("next") ?? "/dashboard";
  const externalError =
    callbackError === "auth_failed"
      ? "Magic link verification failed. Please request a new link."
      : null;

  return (
    <main
      style={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        background:
          "radial-gradient(60rem 30rem at 50% 0%, rgba(45,90,39,0.06), transparent 60%), linear-gradient(180deg, #FAF9F6, #F0EDE6)"
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
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
              margin: "8px 0 6px",
              fontFamily: "var(--font-serif)",
              fontSize: "1.8rem"
            }}
          >
            Sign in
          </h1>
          <p style={{ margin: 0, color: "#4A5568", fontSize: "0.92rem" }}>
            Enter your email to receive a secure sign-in link.
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(74,85,104,0.12)",
            borderRadius: 16,
            padding: 28,
            boxShadow: "0 4px 16px rgba(26,26,46,0.06)"
          }}
        >
          {state?.sent ? (
            <div
              style={{
                textAlign: "center",
                padding: "8px 0"
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(45,90,39,0.1)",
                  color: "#2D5A27",
                  fontSize: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px"
                }}
              >
                ✓
              </div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>
                Check your email
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  color: "#4A5568",
                  fontSize: "0.88rem",
                  lineHeight: 1.5
                }}
              >
                We sent a sign-in link. Click it to access the dashboard.
              </p>
            </div>
          ) : (
            <form action={action}>
              <input type="hidden" name="next" value={nextPath} />
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "#1A1A2E",
                  marginBottom: 6
                }}
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                style={{
                  display: "block",
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid rgba(74,85,104,0.24)",
                  borderRadius: 8,
                  fontSize: "0.95rem",
                  background: "#FAF9F6",
                  marginBottom: 14,
                  boxSizing: "border-box",
                  outline: "none"
                }}
              />

              {(state?.error || externalError) && (
                <p
                  style={{
                    margin: "0 0 12px",
                    color: "#9B3A47",
                    fontSize: "0.85rem",
                    background: "rgba(212,131,143,0.1)",
                    padding: "8px 12px",
                    borderRadius: 8
                  }}
                >
                  {state?.error ?? externalError}
                </p>
              )}

              <SubmitButton />
            </form>
          )}

          {devBypassEnabled && !state?.sent && (
            <form action={bypassAction} style={{ marginTop: 10 }}>
              <input type="hidden" name="next" value={nextPath} />
              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "10px 0",
                  background: "rgba(74,85,104,0.08)",
                  color: "#1A1A2E",
                  border: "1px solid rgba(74,85,104,0.18)",
                  borderRadius: 10,
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Continue as Local Superadmin
              </button>
            </form>
          )}

          {devBypassEnabled && bypassState?.error && (
            <p
              style={{
                margin: "10px 0 0",
                color: "#9B3A47",
                fontSize: "0.82rem",
                background: "rgba(212,131,143,0.1)",
                padding: "8px 12px",
                borderRadius: 8
              }}
            >
              {bypassState.error}
            </p>
          )}
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: 16,
            color: "#A0AEC0",
            fontSize: "0.82rem"
          }}
        >
          No password required &middot; Secure magic link
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
