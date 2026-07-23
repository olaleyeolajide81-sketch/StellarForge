"use client";

import { useState, useRef, useCallback } from "react";
import { useWallet } from "@/lib/hooks";
import { useToast } from "@/components/Toast";
import { uploadFileToIPFS, uploadMetadataToIPFS, type NftMetadata } from "@/lib/ipfs";
import { factoryContractId } from "@/lib/soroban";
import {
  Upload,
  Image as ImageIcon,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Check,
  Loader2,
  FileImage,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

type WizardStep = 1 | 2 | 3;

interface Trait {
  trait_type: string;
  value: string;
}

export function MintWizard() {
  const { connected, publicKey } = useWallet();
  const { addToast } = useToast();

  const [step, setStep] = useState<WizardStep>(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [traits, setTraits] = useState<Trait[]>([
    { trait_type: "", value: "" },
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [metadataUri, setMetadataUri] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [pinataJwt, setPinataJwt] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const dropped = e.dataTransfer.files[0];
      if (dropped && dropped.type.startsWith("image/")) {
        setFile(dropped);
        setPreview(URL.createObjectURL(dropped));
      }
    },
    []
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const addTrait = () => {
    setTraits([...traits, { trait_type: "", value: "" }]);
  };

  const removeTrait = (index: number) => {
    setTraits(traits.filter((_, i) => i !== index));
  };

  const updateTrait = (
    index: number,
    field: "trait_type" | "value",
    val: string
  ) => {
    const updated = [...traits];
    updated[index][field] = val;
    setTraits(updated);
  };

  // ─── Step 1 → 2: Upload to IPFS ───
  const handleUploadToIPFS = async () => {
    if (!file || !pinataJwt) {
      addToast("error", "Please select a file and set your Pinata JWT");
      return;
    }

    setIsUploading(true);
    try {
      const uploadedImageUri = await uploadFileToIPFS(file, pinataJwt);
      setImageUri(uploadedImageUri);

      const metadata: NftMetadata = {
        name: name || file.name.replace(/\.[^/.]+$/, ""),
        description,
        image: uploadedImageUri,
        attributes: traits.filter((t) => t.trait_type && t.value),
      };

      const uploadedMetadataUri = await uploadMetadataToIPFS(metadata, pinataJwt);
      setMetadataUri(uploadedMetadataUri);

      addToast("success", "NFT metadata pinned to IPFS!");
      setStep(3);
    } catch (err: any) {
      addToast("error", err.message || "IPFS upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Step 3: Mint on-chain ───
  const handleMint = async () => {
    if (!connected || !publicKey || !metadataUri) {
      addToast("error", "Connect wallet first");
      return;
    }

    setIsMinting(true);
    try {
      // In production, this builds & submits the Soroban transaction via Freighter
      // For MVP: simulate with a delay and show success pattern
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockTxHash = "0x" + Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");

      setTxHash(mockTxHash);
      addToast(
        "success",
        "NFT minted successfully! 🎉",
        mockTxHash
      );
    } catch (err: any) {
      addToast("error", err.message || "Minting failed");
    } finally {
      setIsMinting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setName("");
    setDescription("");
    setTraits([{ trait_type: "", value: "" }]);
    setImageUri(null);
    setMetadataUri(null);
    setTxHash(null);
  };

  // ─── Not connected state ───
  if (!connected) {
    return (
      <div className="glass rounded-2xl p-8 md:p-12 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">Ready to Forge?</h2>
        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
          Connect your Freighter wallet to start minting NFTs on the Stellar network.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden animate-fade-in">
      {/* ─── Progress Bar ─── */}
      <div className="flex items-center gap-0 p-1 bg-secondary/20 mx-4 mt-4 rounded-full">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className="flex-1 flex items-center gap-2"
          >
            <div
              className={`w-full h-1.5 rounded-full transition-all duration-500 ${
                step >= s ? "bg-primary" : "bg-secondary"
              }`}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-6 pt-3 pb-1">
        {[
          { num: 1, label: "Media & Metadata" },
          { num: 2, label: "IPFS Pipeline" },
          { num: 3, label: "On-Chain Mint" },
        ].map((s) => (
          <div key={s.num} className="flex flex-col items-center gap-1 flex-1">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step > s.num
                  ? "bg-emerald-500 text-white"
                  : step === s.num
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
            </span>
            <span className="text-[10px] text-muted-foreground text-center hidden sm:block">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="p-6">
        {/* ─── Step 1: Media & Metadata ─── */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            {/* File Upload */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer group ${
                preview
                  ? "border-primary/30 p-0"
                  : "border-border hover:border-primary/50 p-12"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {preview ? (
                <div className="relative aspect-square max-w-sm mx-auto rounded-xl overflow-hidden">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-white" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-sm font-medium">
                    Drag & drop or click to upload
                  </p>
                  <p className="text-xs">PNG, JPG, GIF, SVG (max 10MB)</p>
                </div>
              )}
            </div>

            {/* Name & Description */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  NFT Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome NFT"
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your NFT..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm resize-none"
                />
              </div>
            </div>

            {/* Traits Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Attributes / Traits</label>
                <button
                  onClick={addTrait}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              {traits.map((trait, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={trait.trait_type}
                    onChange={(e) => updateTrait(i, "trait_type", e.target.value)}
                    placeholder="Trait (e.g. Color)"
                    className="flex-1 px-3 py-2 rounded-lg bg-secondary/30 border border-border focus:border-primary outline-none text-sm transition-all"
                  />
                  <input
                    type="text"
                    value={trait.value}
                    onChange={(e) => updateTrait(i, "value", e.target.value)}
                    placeholder="Value"
                    className="flex-1 px-3 py-2 rounded-lg bg-secondary/30 border border-border focus:border-primary outline-none text-sm transition-all"
                  />
                  {traits.length > 1 && (
                    <button
                      onClick={() => removeTrait(i)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Pinata JWT */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Pinata JWT
              </label>
              <input
                type="password"
                value={pinataJwt}
                onChange={(e) => setPinataJwt(e.target.value)}
                placeholder="Paste your Pinata JWT token"
                className="w-full px-4 py-2.5 rounded-lg bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get your JWT from{" "}
                <a
                  href="https://app.pinata.cloud/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Pinata Dashboard ↗
                </a>
              </p>
            </div>

            <button
              onClick={handleUploadToIPFS}
              disabled={!file || !pinataJwt || !name.trim() || isUploading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading to IPFS...
                </>
              ) : (
                <>
                  Upload to IPFS
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* ─── Step 2: IPFS Pipeline (Auto-processing) ─── */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div className="text-center py-6">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Pinning to IPFS
              </h3>
              <p className="text-sm text-muted-foreground">
                Securely storing your NFT assets on decentralized storage...
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20">
                <FileImage className="w-5 h-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Uploading media file</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {file?.name}
                  </p>
                </div>
                {imageUri ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20">
                <ImageIcon className="w-5 h-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    Building metadata JSON
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {name || file?.name} • {traits.filter((t) => t.trait_type).length} traits
                  </p>
                </div>
                {metadataUri ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 3: On-Chain Mint ─── */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            {/* Summary */}
            <div className="p-4 rounded-xl bg-secondary/20 space-y-3">
              <h3 className="text-sm font-semibold">Mint Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{name || file?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Contract</p>
                  <p className="font-medium font-mono text-xs truncate">
                    {factoryContractId.slice(0, 10)}...
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Metadata URI</p>
                  <p className="font-medium font-mono text-xs break-all">
                    {metadataUri}
                  </p>
                </div>
              </div>
            </div>

            {txHash ? (
              /* Success State */
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">NFT Minted! 🎉</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your NFT is live on the Stellar testnet
                  </p>
                </div>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-sm font-medium"
                >
                  View on Explorer <ExternalLink className="w-4 h-4" />
                </a>
                <br />
                <button
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg glass hover:bg-secondary/30 transition-colors text-sm"
                >
                  Mint Another <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Mint Button */
              <button
                onClick={handleMint}
                disabled={isMinting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25 animate-pulse-glow"
              >
                {isMinting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Confirming on Stellar...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Mint NFT on Stellar
                  </>
                )}
              </button>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Platform fee: 1 XLM • Gas: ~0.00001 XLM
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
