"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/lib/hooks";
import { getIpfsGatewayUrl, shortenAddress, formatDate } from "@/lib/utils";
import { ExternalLink, ImageOff, Loader2, Grid3X3 } from "lucide-react";

interface NftCard {
  tokenId: number;
  name: string;
  imageUrl: string;
  metadataUri: string;
  owner: string;
  mintedAt: number;
}

// Mock gallery data for demonstration
const MOCK_NFTS: NftCard[] = [
  {
    tokenId: 1,
    name: "StellarForge Genesis #001",
    imageUrl: "ipfs://QmYN3nwwYt2GyZg3qtPGKbmj7RZpN7ZRUGdVn3CSTtRK7K/genesis.png",
    metadataUri: "ipfs://QmTestCase1",
    owner: "GA4HEQHQW5MNS3SCFJ5BNYJWBOILNXORBYB3VEFIFGJRBZJITL7XCA7T",
    mintedAt: Date.now() - 3600000,
  },
  {
    tokenId: 2,
    name: "Cosmic Voyager #042",
    imageUrl: "ipfs://QmYN3nwwYt2GyZg3qtPGKbmj7RZpN7ZRUGdVn3CSTtRK7K/cosmic.png",
    metadataUri: "ipfs://QmTestCase2",
    owner: "GA4HEQHQW5MNS3SCFJ5BNYJWBOILNXORBYB3VEFIFGJRBZJITL7XCA7T",
    mintedAt: Date.now() - 7200000,
  },
  {
    tokenId: 3,
    name: "Digital Renaissance #007",
    imageUrl: "ipfs://QmYN3nwwYt2GyZg3qtPGKbmj7RZpN7ZRUGdVn3CSTtRK7K/renaissance.png",
    metadataUri: "ipfs://QmTestCase3",
    owner: "GB4HEQHQW5MNS3SCFJ5BNYJWBOILNXORBYB3VEFIFGJRBZJITL7XCA7T",
    mintedAt: Date.now() - 86400000,
  },
  {
    tokenId: 4,
    name: "Neon Genesis #023",
    imageUrl: "ipfs://QmYN3nwwYt2GyZg3qtPGKbmj7RZpN7ZRUGdVn3CSTtRK7K/neon.png",
    metadataUri: "ipfs://QmTestCase4",
    owner: "GA4HEQHQW5MNS3SCFJ5BNYJWBOILNXORBYB3VEFIFGJRBZJITL7XCA7T",
    mintedAt: Date.now() - 172800000,
  },
];

export function NFTGallery() {
  const { connected, publicKey } = useWallet();
  const [nfts, setNfts] = useState<NftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    // Simulate loading from contract
    const timer = setTimeout(() => {
      setNfts(MOCK_NFTS);
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const userNfts = connected
    ? nfts.filter((n) => n.owner === publicKey)
    : nfts;

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 animate-fade-in">
        <div className="flex items-center gap-2 mb-6">
          <Grid3X3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">NFT Gallery</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden">
              <div className="aspect-square w-full skeleton" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-3/4 skeleton rounded" />
                <div className="h-3 w-1/2 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">
            {connected ? "Your Collection" : "NFT Gallery"}
          </h2>
        </div>
        {connected && (
          <span className="text-xs text-muted-foreground bg-secondary/30 px-2.5 py-1 rounded-full">
            {userNfts.length} NFTs
          </span>
        )}
      </div>

      {nfts.length === 0 ? (
        <div className="text-center py-12">
          <ImageOff className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No NFTs found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Start forging to build your collection!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {userNfts.map((nft) => (
            <div
              key={nft.tokenId}
              className="group rounded-xl overflow-hidden border border-border/50 bg-secondary/10 hover:bg-secondary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
              {/* Image */}
              <div className="aspect-square relative overflow-hidden bg-secondary/20">
                {imageErrors[nft.tokenId] ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff className="w-10 h-10 text-muted-foreground" />
                  </div>
                ) : (
                  <img
                    src={getIpfsGatewayUrl(nft.imageUrl)}
                    alt={nft.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={() =>
                      setImageErrors((prev) => ({ ...prev, [nft.tokenId]: true }))
                    }
                    loading="lazy"
                  />
                )}
                {/* Token ID Badge */}
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-xs font-mono">
                  #{nft.tokenId}
                </span>
              </div>

              {/* Info */}
              <div className="p-3 space-y-1.5">
                <h3 className="text-sm font-semibold truncate">{nft.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {formatDate(nft.mintedAt)}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground font-mono">
                    {shortenAddress(nft.owner, 4)}
                  </span>
                  <a
                    href={`https://stellar.expert/explorer/testnet/contract/${nft.owner}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
                    title="View on Explorer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state for filtered collection */}
      {connected && userNfts.length === 0 && nfts.length > 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">
            You don&apos;t own any NFTs yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Switch to the Forge tab to mint your first NFT!
          </p>
        </div>
      )}
    </div>
  );
}
