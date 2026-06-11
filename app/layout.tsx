import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Global Future Impact Simulator",
  description: "Compare countries using World Bank indicators and ESCO occupation matching.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
