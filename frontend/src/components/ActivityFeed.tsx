"use client";

import { useContractEvents, type ContractEvent } from "@/lib/hooks";
import { factoryContractId } from "@/lib/soroban";
import { shortenAddress, formatDate } from "@/lib/utils";
import { Activity, Sparkles, ArrowRightLeft, ExternalLink, Radio } from "lucide-react";

function EventIcon({ topic }: { topic: string }) {
  switch (topic) {
    case "mint":
    case "mint_factory":
      return <Sparkles className="w-4 h-4 text-emerald-400" />;
    case "transfer":
      return <ArrowRightLeft className="w-4 h-4 text-blue-400" />;
    case "deploy_nft":
      return <Activity className="w-4 h-4 text-violet-400" />;
    default:
      return <Radio className="w-4 h-4 text-muted-foreground" />;
  }
}

function EventLabel({ topic }: { topic: string }) {
  switch (topic) {
    case "mint":
    case "mint_factory":
      return "Mint";
    case "transfer":
      return "Transfer";
    case "deploy_nft":
      return "Deploy";
    default:
      return topic;
  }
}

export function ActivityFeed() {
  const events = useContractEvents(factoryContractId, 5000);

  return (
    <div className="glass rounded-2xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold">Live Activity</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </div>

      {/* Event List */}
      <div className="max-h-[500px] overflow-y-auto">
        {events.length === 0 ? (
          <div className="py-12 text-center">
            <Radio className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">
              Listening for events...
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              New mints and transfers will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 hover:bg-secondary/10 transition-colors"
              >
                <div className="mt-0.5 p-1.5 rounded-lg bg-secondary/30">
                  <EventIcon topic={event.topic} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">
                      <EventLabel topic={event.topic} />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(event.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                    {shortenAddress(event.contractId, 6)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-secondary/50 text-muted-foreground">
                  Ledger #{event.ledger}
                    </span>
                  </div>
                </div>
                <a
                  href={`https://stellar.expert/explorer/testnet/contract/${event.contractId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded-lg hover:bg-secondary/30 transition-colors shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
