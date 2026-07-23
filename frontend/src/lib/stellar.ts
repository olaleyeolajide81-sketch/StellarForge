import {
  isConnected,
  getAddress,
  signTransaction,
  requestAccess,
} from "@stellar/freighter-api";
import type { NetworkDetails } from "@stellar/freighter-api";

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  networkPassphrase: string;
}

/**
 * Check if Freighter wallet is connected and get public key.
 */
export async function checkWalletConnection(): Promise<WalletState> {
  try {
    const connected = await isConnected();
    if (!connected) {
      return { connected: false, publicKey: null, networkPassphrase: "" };
    }

    const publicKey = await getAddress();
    const network: NetworkDetails = (await (
      window as any
    ).stellar?.requestNetwork()) || { networkPassphrase: "" };

    return {
      connected: true,
      publicKey: publicKey.address,
      networkPassphrase: network.networkPassphrase,
    };
  } catch (error) {
    console.error("Freighter connection error:", error);
    return { connected: false, publicKey: null, networkPassphrase: "" };
  }
}

/**
 * Request Freighter wallet access.
 */
export async function connectWallet(): Promise<string | null> {
  try {
    const access = await requestAccess();
    if (access.error) {
      console.error("Freighter access denied:", access.error);
      return null;
    }
    const publicKey = await getAddress();
    return publicKey.address;
  } catch (error) {
    console.error("Failed to connect Freighter:", error);
    return null;
  }
}

/**
 * Sign a Soroban transaction XDR with Freighter.
 */
export async function signTransactionWithFreighter(
  xdr: string,
  networkPassphrase: string
): Promise<string> {
  const result = await signTransaction(xdr, {
    networkPassphrase,
    accountToSign: (await getAddress()).address,
  });
  return result.signedTxXdr;
}

/**
 * Get the network passphrase for current network.
 */
export async function getNetworkPassphrase(): Promise<string> {
  try {
    const network: NetworkDetails = await (
      (window as any).stellar?.requestNetwork() || { networkPassphrase: "" }
    );
    return network.networkPassphrase;
  } catch {
    return "Test SDF Network ; September 2015";
  }
}
