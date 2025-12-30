
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "DealPulse — M&A Intelligence Platform",
  description: "Automated deal intelligence monitoring. Track changes, identify blockers, and surface critical risks in real-time.",
  keywords: ["M&A", "deal intelligence", "due diligence", "deal monitoring", "business intelligence"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
