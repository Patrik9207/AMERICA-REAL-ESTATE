import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "America Real Estate | US REIT analysis",
  description: "A focused dashboard for exploring US Real Estate Investment Trusts.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}