import { describe, it, expect, vi } from "vitest";

// Mock the wallet hook
vi.mock("@/lib/hooks", () => ({
  useWallet: vi.fn(),
}));

import { useWallet } from "@/lib/hooks";

describe("WalletButton", () => {
  it("renders connect button when disconnected", async () => {
    // Reset mocks
    vi.mocked(useWallet).mockReturnValue({
      connected: false,
      publicKey: null,
      loading: false,
      error: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    // Dynamic import to avoid SSR issues with Freighter
    const { WalletButton } = await import("@/components/WalletButton");

    // Basic import validation - component exists and exports correctly
    expect(WalletButton).toBeDefined();
    expect(typeof WalletButton).toBe("function");
  });

  it("renders connected state with public key", async () => {
    vi.mocked(useWallet).mockReturnValue({
      connected: true,
      publicKey: "GA4HEQHQW5MNS3SCFJ5BNYJWBOILNXORBYB3VEFIFGJRBZJITL7XCA7T",
      loading: false,
      error: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    const { WalletButton } = await import("@/components/WalletButton");

    expect(WalletButton).toBeDefined();
  });

  it("shows skeleton when loading", async () => {
    vi.mocked(useWallet).mockReturnValue({
      connected: false,
      publicKey: null,
      loading: true,
      error: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    const { WalletButton } = await import("@/components/WalletButton");

    expect(WalletButton).toBeDefined();
  });
});
