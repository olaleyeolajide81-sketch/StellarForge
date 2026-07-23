import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StellarForge | NFT Minter & Asset Factory",
  description:
    "Advanced NFT Minter, Asset Factory, and Digital Rights platform built on Stellar and Soroban.",
  openGraph: {
    title: "StellarForge",
    description: "Forge NFTs on Stellar with Soroban smart contracts",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ToastProvider>
          <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-background/95">
            {children}
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
