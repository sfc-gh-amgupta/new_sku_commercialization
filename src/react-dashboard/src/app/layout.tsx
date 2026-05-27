import type { Metadata } from "next";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";

export const metadata: Metadata = {
  title: "SKU Launch Analytics",
  description: "12-week post-launch performance dashboard powered by Snowflake Cortex",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
