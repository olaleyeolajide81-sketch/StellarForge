"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { MintWizard } from "@/components/MintWizard";
import { NFTGallery } from "@/components/NFTGallery";
import { ActivityFeed } from "@/components/ActivityFeed";

type View = "mint" | "gallery" | "activity";

export default function Home() {
  const [activeView, setActiveView] = useState<View>("mint");

  return (
    <>
      <Navbar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
          {/* ─── View Navigation (Mobile Pills) ─── */}
          <div className="flex md:hidden gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: "mint" as const, label: "⚒️ Forge", icon: "⚒️" },
              { id: "gallery" as const, label: "🖼️ Gallery", icon: "🖼️" },
              { id: "activity" as const, label: "📡 Activity", icon: "📡" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeView === tab.id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "glass text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ─── Desktop Layout ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Desktop: Show both Mint + Gallery */}
              <div className="hidden md:block">
                {activeView === "mint" && <MintWizard />}
                {activeView === "gallery" && <NFTGallery />}
              </div>
              {/* Mobile: Show active view only */}
              <div className="block md:hidden">
                {activeView === "mint" && <MintWizard />}
                {activeView === "gallery" && <NFTGallery />}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Desktop: Always show Activity Feed */}
              <div className="hidden lg:block">
                <ActivityFeed />
              </div>
              {/* Mobile: Show activity only when selected */}
              <div className="block lg:hidden">
                {activeView === "activity" && <ActivityFeed />}
              </div>

              {/* Quick Stats Card */}
              <div className="glass rounded-xl p-5 space-y-4 animate-fade-in">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  ⚡ Network Status
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Network</span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Testnet
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">RPC</span>
                    <span className="text-xs text-emerald-400">Connected</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Factory</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
