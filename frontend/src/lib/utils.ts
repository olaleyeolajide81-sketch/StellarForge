import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatStroops(stroops: number): string {
  return (stroops / 10_000_000).toFixed(7) + " XLM";
}

export function getExplorerUrl(
  network: string,
  type: "contract" | "account" | "tx",
  id: string
): string {
  const base =
    network === "testnet"
      ? "https://stellar.expert/explorer/testnet"
      : "https://stellar.expert/explorer/public";

  switch (type) {
    case "contract":
      return `${base}/contract/${id}`;
    case "account":
      return `${base}/account/${id}`;
    case "tx":
      return `${base}/tx/${id}`;
  }
}

export function getIpfsGatewayUrl(uri: string): string {
  const cid = uri.replace("ipfs://", "");
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
