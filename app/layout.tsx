import type { Metadata } from "next";
import { Quicksand, Pacifico } from "next/font/google";
import "./globals.css";

const quicksand = Quicksand({
  variable: "--font-sans",
  subsets: ["latin"],
});

const pacifico = Pacifico({
  variable: "--font-script",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Axelina + Tim 2026 💕",
  description: "Ladda upp bilder från bröllopet här",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sv"
      className={`${quicksand.variable} ${pacifico.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
