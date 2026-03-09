"use client";

import Link from "next/link";
import type { ReactNode, CSSProperties } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  children: ReactNode;
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  fullWidth?: boolean;
  style?: CSSProperties;
}

const sizeMap: Record<ButtonSize, CSSProperties> = {
  sm: { padding: "6px 14px", fontSize: "13px" },
  md: { padding: "10px 20px", fontSize: "14px" },
  lg: { padding: "14px 28px", fontSize: "15px" }
};

const variantMap: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: "#2D5A27",
    color: "#FFFFFF",
    border: "1px solid #2D5A27"
  },
  secondary: {
    background: "transparent",
    color: "#2D5A27",
    border: "1px solid #2D5A27"
  },
  ghost: {
    background: "transparent",
    color: "#4A5568",
    border: "1px solid transparent"
  }
};

export default function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  onClick,
  type = "button",
  disabled = false,
  fullWidth = false,
  style: extraStyle
}: ButtonProps) {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    borderRadius: "8px",
    fontWeight: 600,
    fontFamily: "inherit",
    letterSpacing: "0.01em",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    textDecoration: "none",
    transition: "opacity 0.15s, box-shadow 0.15s",
    width: fullWidth ? "100%" : undefined,
    ...variantMap[variant],
    ...sizeMap[size],
    ...extraStyle
  };

  if (href) {
    return (
      <Link href={href} style={base}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} style={base}>
      {children}
    </button>
  );
}
