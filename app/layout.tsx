import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZeroFee GA4 API",
  description: "GA4 reporting endpoints for Bubble.io",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
