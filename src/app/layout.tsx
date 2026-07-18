import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flavour Heaven | Online Ordering",
  description: "Order shawarmas, burgers, deals, and cafe favorites from Flavour Heaven Islamabad.",
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
