"use client";

import { useState, useEffect, useCallback } from "react";
import { getContractEvents } from "@/lib/soroban";
import { checkWalletConnection, connectWallet } from "@/lib/stellar";

// ─── Wallet Hook ────────────────────────────────────────────────────────────

export interface UseWalletReturn {
  connected: boolean;
  publicKey: string | null;
  loading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useWallet(): UseWalletReturn {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const state = await checkWalletConnection();
        setConnected(state.connected);
        setPublicKey(state.publicKey);
      } catch (err) {
        setError("Failed to check wallet connection");
      } finally {
        setLoading(false);
      }
    };
    check();
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const key = await connectWallet();
      if (key) {
        setPublicKey(key);
        setConnected(true);
      } else {
        setError("Wallet connection rejected");
      }
    } catch (err) {
      setError("Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setConnected(false);
    setPublicKey(null);
  }, []);

  return { connected, publicKey, loading, error, connect, disconnect };
}

// ─── Event Stream Hook ─────────────────────────────────────────────────────

export interface ContractEvent {
  id: string;
  type: string;
  contractId: string;
  topic: string;
  data: string;
  ledger: number;
  timestamp: number;
}

export function useContractEvents(
  contractId: string | null,
  pollIntervalMs = 5000
) {
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [lastLedger, setLastLedger] = useState<number | undefined>();

  useEffect(() => {
    if (!contractId) return;

    let active = true;

    const poll = async () => {
      try {
        const response = await getContractEvents(
          contractId,
          lastLedger
        );

        if (!active) return;

        if (response.events && response.events.length > 0) {
          const newEvents: ContractEvent[] = response.events.map((e: any) => ({
            id: e.id,
            type: e.type,
            contractId: contractId!,
            topic: e.topic?.[0]?.toString() || "unknown",
            data: JSON.stringify(e.value),
            ledger: e.ledger,
            timestamp: Date.now(),
          }));

          setEvents((prev) => {
            const existing = new Set(prev.map((e) => e.id));
            const added = newEvents.filter((e) => !existing.has(e.id));
            return [...added, ...prev].slice(0, 100);
          });

          const maxLedger = Math.max(
            ...newEvents.map((e) => e.ledger)
          );
          setLastLedger(maxLedger + 1);
        }
      } catch (err) {
        // Silently continue polling
      }
    };

    poll();
    const interval = setInterval(poll, pollIntervalMs);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [contractId, lastLedger, pollIntervalMs]);

  return events;
}

// ─── Mutable Ref Hook ───────────────────────────────────────────────────────

export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
