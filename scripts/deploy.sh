#!/usr/bin/env bash
#
# StellarForge Deployment Script
# Deploys ForgeFactory and ForgeNFT contracts to the Stellar testnet using
# the stellar-cli. Automatically updates the frontend .env.local with
# deployed contract addresses.
#
# Requirements:
#   - stellar-cli installed and in PATH
#   - A funded Stellar testnet account (set via STELLAR_ACCOUNT env var or .env)
#   - rust with wasm32v1-none target (for soroban-sdk 27.x)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONTRACTS_DIR="$PROJECT_ROOT/contracts"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
ENV_FILE="$FRONTEND_DIR/.env.local"

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
banner()      { echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"; }

# ─── Configuration ───────────────────────────────────────────────────────────

NETWORK="${STELLAR_NETWORK:-testnet}"
RPC_URL="${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}"
NETWORK_PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"

# Source account secret key (required)
: "${STELLAR_SECRET_KEY:?STELLAR_SECRET_KEY environment variable is required}"
SECRET_KEY="$STELLAR_SECRET_KEY"

# Derive public key
PUBLIC_KEY=$(printf "%s" "$SECRET_KEY" | stellar keys show --global --network "$NETWORK" 2>/dev/null || echo "unknown")
log_info "Deploying from account: $PUBLIC_KEY"

# ─── WASM Paths ──────────────────────────────────────────────────────────────

FORGE_NFT_WASM="$CONTRACTS_DIR/target/wasm32v1-none/release/forge_nft.wasm"
FORGE_FACTORY_WASM="$CONTRACTS_DIR/target/wasm32v1-none/release/forge_factory.wasm"

# ─── Step 1: Build Contracts ─────────────────────────────────────────────────
banner "Step 1: Building WASM Contracts"

log_info "Building ForgeNFT..."
(cd "$CONTRACTS_DIR" && cargo build --package forge-nft --target wasm32v1-none --release)
log_success "ForgeNFT built: $FORGE_NFT_WASM"

log_info "Building ForgeFactory..."
(cd "$CONTRACTS_DIR" && cargo build --package forge-factory --target wasm32v1-none --release)
log_success "ForgeFactory built: $FORGE_FACTORY_WASM"

# ─── Step 2: Install & Optimize WASM ────────────────────────────────────────
banner "Step 2: Installing & Optimizing WASM"

log_info "Installing ForgeNFT WASM..."
FORGE_NFT_HASH=$(stellar contract install \
    --wasm "$FORGE_NFT_WASM" \
    --source "$SECRET_KEY" \
    --network "$NETWORK" \
    --rpc-url "$RPC_URL" \
    2>&1 | tail -1)
log_success "ForgeNFT WASM hash: $FORGE_NFT_HASH"

log_info "Installing ForgeFactory WASM..."
FORGE_FACTORY_HASH=$(stellar contract install \
    --wasm "$FORGE_FACTORY_WASM" \
    --source "$SECRET_KEY" \
    --network "$NETWORK" \
    --rpc-url "$RPC_URL" \
    2>&1 | tail -1)
log_success "ForgeFactory WASM hash: $FORGE_FACTORY_HASH"

# ─── Step 3: Deploy ForgeFactory ────────────────────────────────────────────
banner "Step 3: Deploying ForgeFactory"

log_info "Deploying ForgeFactory contract..."
FORGE_FACTORY_ID=$(stellar contract deploy \
    --wasm-hash "$FORGE_FACTORY_HASH" \
    --source "$SECRET_KEY" \
    --network "$NETWORK" \
    --rpc-url "$RPC_URL" \
    2>&1 | tail -1)
log_success "ForgeFactory deployed at: $FORGE_FACTORY_ID"

# ─── Step 4: Initialize ForgeFactory ────────────────────────────────────────
banner "Step 4: Initializing ForgeFactory"

# Platform fee: 1 XLM = 10_000_000 stroops
PLATFORM_FEE_STROOPS="${PLATFORM_FEE_STROOPS:-10000000}"

# Fee token: the Stellar Asset Contract (SAC) address for native XLM
# On testnet, this is derived from the native asset
# The SAC address for XLM can be obtained via: stellar contract id asset --asset native --network testnet
DEFAULT_SAC_ADDRESS="CB64D3G7SM2RTH6JSGG34HVJK7GMS6PYGJSC2KFYQJQMYGGSSM2PAFZT"
FEE_TOKEN_ID="${FEE_TOKEN_ID:-$DEFAULT_SAC_ADDRESS}"

log_info "Initializing ForgeFactory with fee: $PLATFORM_FEE_STROOPS stroops..."
log_info "Fee token (SAC): $FEE_TOKEN_ID"
stellar contract invoke \
    --id "$FORGE_FACTORY_ID" \
    --source "$SECRET_KEY" \
    --network "$NETWORK" \
    --rpc-url "$RPC_URL" \
    -- \
    initialize \
    --admin "$PUBLIC_KEY" \
    --fee_token_id "$FEE_TOKEN_ID" \
    --platform_fee_stroops "$PLATFORM_FEE_STROOPS" \
    --nft_wasm_hash "$FORGE_NFT_HASH"

log_success "ForgeFactory initialized"

# ─── Step 5: Deploy Initial ForgeNFT Instance ───────────────────────────────
banner "Step 5: Deploying Initial ForgeNFT Instance"

# Generate a deterministic salt (first deployment)
INITIAL_SALT="0000000000000000000000000000000000000000000000000000000000000001"

log_info "Deploying ForgeNFT via factory with salt: $INITIAL_SALT..."
FORGE_NFT_ID=$(stellar contract invoke \
    --id "$FORGE_FACTORY_ID" \
    --source "$SECRET_KEY" \
    --network "$NETWORK" \
    --rpc-url "$RPC_URL" \
    -- \
    deploy_nft \
    --deployer "$PUBLIC_KEY" \
    --salt "$INITIAL_SALT" \
    --name "StellarForge Genesis" \
    --symbol "SFG" \
    2>&1 | tail -1)

log_success "Initial ForgeNFT deployed at: $FORGE_NFT_ID"

# ─── Step 6: Update Frontend Environment ────────────────────────────────────
banner "Step 6: Updating Frontend Configuration"

log_info "Writing .env.local for frontend..."

cat > "$ENV_FILE" << EOF
# StellarForge Frontend Environment
# Auto-generated by deploy.sh on $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# DO NOT commit this file to version control

NEXT_PUBLIC_STELLAR_NETWORK=$NETWORK
NEXT_PUBLIC_STELLAR_RPC_URL=$RPC_URL
NEXT_PUBLIC_STELLAR_PASSPHRASE="$NETWORK_PASSPHRASE"

NEXT_PUBLIC_FORGE_FACTORY_ID=$FORGE_FACTORY_ID
NEXT_PUBLIC_FORGE_NFT_ID=$FORGE_NFT_ID
NEXT_PUBLIC_FEE_TOKEN_ID=$FEE_TOKEN_ID

# IPFS Configuration (set these manually)
# NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt
# NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud
EOF

log_success "Environment file created: $ENV_FILE"

# ─── Summary ─────────────────────────────────────────────────────────────────
banner "Deployment Complete"

echo ""
echo -e "${GREEN}  ✅ All contracts deployed successfully!${NC}"
echo ""
echo -e "  ${CYAN}Network:${NC}           $NETWORK"
echo -e "  ${CYAN}RPC URL:${NC}           $RPC_URL"
echo -e "  ${CYAN}Deployer:${NC}          $PUBLIC_KEY"
echo ""
echo -e "  ${CYAN}ForgeFactory ID:${NC}   $FORGE_FACTORY_ID"
echo -e "  ${CYAN}ForgeNFT ID:${NC}       $FORGE_NFT_ID"
echo -e "  ${CYAN}ForgeNFT Hash:${NC}     $FORGE_NFT_HASH"
echo -e "  ${CYAN}Factory Hash:${NC}      $FORGE_FACTORY_HASH"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo -e "    1. Set Pinata JWT in $ENV_FILE"
echo -e "    2. Run: cd frontend && npm run dev"
echo -e "    3. Open http://localhost:3000"
echo ""
