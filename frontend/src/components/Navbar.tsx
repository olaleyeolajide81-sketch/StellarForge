"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { WalletButton } from "@/components/WalletButton";
import { Menu, X, Flame } from "lucide-react";

interface NavbarProps {
  activeView: "mint" | "gallery" | "activity";
  onViewChange: (view: "mint" | "gallery" | "activity") => void;
}

const navLinks: { id: NavbarProps["activeView"]; label: string; desc: string }[] = [
  { id: "mint", label: "Forge", desc: "Mint new NFTs" },
  { id: "gallery", label: "Gallery", desc: "Browse collection" },
  { id: "activity", label: "Activity", desc: "Live events" },
];

export function Navbar({ activeView, onViewChange }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 glass">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          {/* ─── Logo ─── */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight gradient-text hidden sm:block">
              StellarForge
            </span>
          </div>

          {/* ─── Desktop Nav ─── */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => onViewChange(link.id)}
                className={cn(
                  "relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  activeView === link.id
                    ? "text-primary-foreground bg-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {link.label}
                {activeView === link.id && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </nav>

          {/* ─── Right Section ─── */}
          <div className="flex items-center gap-3">
            {/* Network Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Testnet
            </div>

            <WalletButton />

            {/* ─── Mobile Hamburger ─── */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-secondary/50 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Mobile Drawer ─── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 glass animate-slide-up">
          <div className="container mx-auto px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => {
                  onViewChange(link.id);
                  setMobileOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  activeView === link.id
                    ? "bg-primary/20 text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary/30"
                )}
              >
                <span>{link.label}</span>
                <span className="text-xs text-muted-foreground">
                  {link.desc}
                </span>
              </button>
            ))}
            {/* Network status in drawer */}
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground sm:hidden">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected to Testnet
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
