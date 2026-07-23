"use client";

import { useWallet } from "@/lib/hooks";
import { shortenAddress } from "@/lib/utils";
import { LogIn, LogOut, Wallet, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

export function WalletButton() {
  const { connected, publicKey, loading, connect, disconnect } = useWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="h-9 w-32 skeleton rounded-lg" />
    );
  }

  if (!connected) {
    return (
      <button
        onClick={connect}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-95"
      >
        <LogIn className="w-4 h-4" />
        <span className="hidden sm:inline">Connect Wallet</span>
        <span className="sm:hidden">Connect</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg glass hover:bg-secondary/50 transition-all duration-200 border border-border/50"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <Wallet className="w-4 h-4 text-muted-foreground" />
        <span className="hidden sm:inline font-mono text-xs">
          {shortenAddress(publicKey!)}
        </span>
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-64 rounded-xl glass border border-border/50 shadow-2xl z-50 animate-fade-in overflow-hidden">
            <div className="p-3 border-b border-border/50">
              <p className="text-xs text-muted-foreground">Connected as</p>
              <p className="text-sm font-mono font-medium truncate">
                {shortenAddress(publicKey!, 8)}
              </p>
            </div>
            <div className="p-1">
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-secondary/50 transition-colors"
              >
                {copied ? (
                  <>
                    <span className="text-emerald-400">✓</span>
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Address
                  </>
                )}
              </button>
              <a
                href={`https://stellar.expert/explorer/testnet/account/${publicKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View on Explorer
              </a>
              <button
                onClick={() => {
                  disconnect();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
