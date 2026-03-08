import type { ReactNode } from "react";
import "./styles.css";

export const metadata = {
  title: "TerroirOS Trace",
  description: "Open digital trust infrastructure for agricultural provenance."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <a href="/">TerroirOS Trace</a>
          <nav>
            <a href="/dashboard">Producer Dashboard</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
