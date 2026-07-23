# StellarForge

**Advanced NFT Minter, Asset Factory & Digital Rights Platform**

*Built on Stellar | Powered by Soroban | Level 3 (Orange Belt) Submission*

[![Soroban](https://img.shields.io/badge/Soroban-v21-blue)](https://soroban.stellar.org)
[![Rust](https://img.shields.io/badge/Rust-stable-orange)](https://rust-lang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## Architecture Overview

StellarForge is a full-stack decentralized application (dApp) for minting, managing, and trading NFTs on the Stellar network using Soroban smart contracts. It features a dual-contract architecture with inter-contract communication, real-time event streaming, IPFS-backed metadata storage, and a mobile-responsive frontend.

### System Architecture Diagram

```
+-------------------------------------------------------------+
|                        USER BROWSER                          |
|  +------------------+  +------------------+  +------------+  |
|  |   Mint Wizard     |  |   NFT Gallery    |  | Activity  |  |
|  | (Drag & Drop)    |  | (IPFS Rendering) |  | Feed      |  |
|  +--------+---------+  +--------+---------+  +-----+------+  |
|           |                     |                    |        |
|  +--------v---------------------v--------------------v------+|
|  |              Next.js App Router (TypeScript)              ||
|  |  +---------------------------------------------------+   ||
|  |  | @stellar/freighter-api | @stellar/stellar-sdk     |   ||
|  |  | Pinata IPFS Client     | SorobanRpc Event Polling |   ||
|  |  +---------------------------------------------------+   ||
|  +----------------------------------------------------------+|
+-----------------------------+-------------------------------+
                              |
              +---------------v----------------+
              |     STELLAR TESTNET RPC         |
              |  soroban-testnet.stellar.org    |
              +----------------+----------------+
                               |
        +----------------------+----------------------+
        |                                              |
+-------v-------+                            +---------v-------+
|  ForgeFactory  |                            |    ForgeNFT     |
|   (Factory)    |---- deploy_nft() --------->|   (NFT Token)   |
|                |---- mint_via_factory() ---->|                 |
|  - Registry    |                            |  - mint()       |
|  - Fee Mgmt    |                            |  - transfer()   |
|  - Deployer    |                            |  - metadata     |
+----------------+                            +-----------------+
        |                                              |
        +--------------- IPFS PINATA ------------------+
                        (Metadata & Assets)
```

### Smart Contract Architecture

| Contract | Purpose | Key Functions |
|----------|---------|---------------|
| `ForgeFactory` | Platform management, fee collection, contract registry | `deploy_nft`, `mint_via_factory`, `withdraw_fees` |
| `ForgeNFT` | Individual NFT token logic, minting, ownership tracking | `initialize`, `mint`, `transfer`, `balance_of`, `get_metadata` |

**Inter-Contract Communication**: The `ForgeFactory` calls `ForgeNFT::mint()` via Soroban's cross-contract invocation pattern, collecting a platform fee on each mint operation. The factory also deploys new NFT contract instances using stored WASM hashes.

---

## Project Structure

```
StellarForge/
  contracts/
    Cargo.toml                    # Workspace manifest
    rust-toolchain.toml           # Pinned toolchain (wasm32 target)
    forge-nft/
      Cargo.toml
      src/lib.rs                  # ForgeNFT contract
    forge-factory/
      Cargo.toml
      src/lib.rs                  # ForgeFactory contract
    forge-nft/tests/
      test.rs                     # 7+ unit tests
  frontend/
    package.json
    next.config.js
    tailwind.config.ts
    tsconfig.json
    src/
      app/
        globals.css               # Custom theme & animations
        layout.tsx                 # Root layout + metadata
        page.tsx                   # Main page with view routing
      components/
        Navbar.tsx                 # Responsive nav + mobile drawer
        MintWizard.tsx             # 3-step NFT creation wizard
        NFTGallery.tsx             # Responsive NFT grid gallery
        ActivityFeed.tsx           # Real-time event stream
        WalletButton.tsx           # Freighter wallet connect/disconnect
        Toast.tsx                  # Toast notification system
      lib/
        utils.ts                   # Shared utilities
        stellar.ts                 # Freighter wallet integration
        soroban.ts                 # Soroban RPC interactions
        ipfs.ts                    # Pinata IPFS upload utilities
        hooks.ts                   # Custom React hooks
  scripts/
    deploy.sh                      # Automated deployment script
  .github/workflows/
    ci.yml                         # CI/CD pipeline
  README.md
  .gitignore
```

---

## Quickstart Guide

### Prerequisites

- **Rust** (stable) with `wasm32-unknown-unknown` target
- **Node.js** v20+ and npm
- **stellar-cli** (Soroban CLI) for deployment
- **Freighter** browser extension wallet
- **Pinata** account (for IPFS pinning)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/StellarForge.git
cd StellarForge

# Install Rust wasm target
rustup target add wasm32-unknown-unknown

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Run Smart Contract Tests

```bash
cd contracts
cargo test --workspace -- --nocapture
```

Expected output: all 7 tests pass.

### 3. Build WASM Contracts

```bash
cd contracts
cargo build --workspace --target wasm32-unknown-unknown --release
```

Output WASM files:
- `target/wasm32-unknown-unknown/release/forge_nft.wasm`
- `target/wasm32-unknown-unknown/release/forge_factory.wasm`

### 4. Deploy to Testnet

```bash
export STELLAR_SECRET_KEY="S...your-secret-key..."
export STELLAR_NETWORK="testnet"

./scripts/deploy.sh
```

This will:
1. Build both contracts
2. Install WASM on the network
3. Deploy ForgeFactory and initialize it
4. Deploy an initial ForgeNFT instance via the factory
5. Generate `frontend/.env.local` with contract addresses

### 5. Run Frontend

```bash
cd frontend
# Set Pinata JWT in .env.local (from deploy output)
NEXT_PUBLIC_PINATA_JWT=your-jwt-here
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployed Contract Addresses

| Contract | Testnet Address | Transaction Hash |
|----------|----------------|------------------|
| ForgeFactory | `CA4HEQHQW5MNS3SCFJ5BNYJWBOILNXORBYB3VEFIFGJRBZJITL7XCA7T` | *(placeholder)* |
| ForgeNFT (Genesis) | `CB...` | *(placeholder)* |

*Update with actual deployed addresses after running deploy.sh.*

---

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `main`:

| Job | What It Does |
|-----|-------------|
| `test-contracts` | Runs `cargo test --workspace`, verifies 3+ passing tests |
| `build-wasm` | Compiles both contracts to optimized `.wasm`, uploads artifacts |
| `build-frontend` | Runs `tsc --noEmit`, `npm run lint`, `npm run build` |
| `ci-summary` | Aggregates all job results |

---

## Key Features

### Smart Contracts
- **Dual-Contract Architecture** with cross-contract calls (ForgeFactory calls ForgeNFT)
- **Structured Events**: `mint`, `transfer`, `deploy_nft`, `mint_factory`, `fee_collected`
- **Storage Management**: Instance storage for config, Persistent storage for token data with TTL extensions (60-day extensions)
- **Access Control**: Admin-only minting, owner-only transfers with `require_auth()`
- **Platform Fee System**: Configurable fees accumulated and withdrawable by admin
- **Contract Registry**: Factory tracks all deployed NFT contracts

### Frontend
- **Mobile-First Responsive Design**: Fluid layouts, hamburger drawer navigation, touch-optimized controls
- **3-Step Mint Wizard**: Media upload with drag-and-drop, IPFS pinning pipeline, on-chain mint execution
- **Real-Time Activity Feed**: Polls Soroban RPC `getEvents` every 5 seconds for live contract events
- **NFT Gallery**: Responsive grid with IPFS image rendering, lazy loading, and Stellar Expert explorer links
- **Wallet Integration**: Freighter wallet connect/disconnect with address copy and explorer links
- **Toast Notifications**: Success, error, info, and loading states with transaction hash links
- **Dark Theme**: Custom CSS variables, gradient accents, glass-morphism cards, smooth animations
- **Skeleton Loading**: Shimmer loading states for gallery cards and wallet button

### Infrastructure
- **Automated Deployment**: Single `deploy.sh` script handles build, install, deploy, and frontend config
- **CI/CD Pipeline**: GitHub Actions tests contracts, builds WASM, typechecks/lints/builds frontend
- **Reproducible Builds**: Pinned Rust toolchain with explicit wasm target

---

## Test Coverage

Located in `contracts/forge-nft/tests/test.rs`:

| # | Test | Covers |
|---|------|--------|
| 1 | `test_successful_mint_and_balance` | Mint creates token, updates balance, increments supply, verifies metadata |
| 2 | `test_unauthorized_transfer_rejected` | Non-owner transfer panics with "Not token owner" |
| 3 | `test_successful_transfer` | Owner-to-owner transfer updates balances and metadata correctly |
| 4 | `test_factory_mint_via_cross_contract_call` | Factory registry, fee configuration, cross-contract call architecture |
| 5 | `test_factory_fee_collection_and_withdrawal` | Fee collection on deploy, admin withdrawal, balance resets |
| 6 | `test_double_initialize_nft` | Second `initialize` call panics with "Already initialized" |
| 7 | `test_get_nonexistent_token` | Querying non-existent token panics with "Token does not exist" |

---

## API Reference

### ForgeNFT Contract

| Function | Params | Returns | Auth |
|----------|--------|---------|------|
| `initialize` | `admin: Address, name: String, symbol: String` | - | `admin` |
| `mint` | `to: Address, uri: String` | `u32` (token_id) | `admin` |
| `transfer` | `from: Address, to: Address, token_id: u32` | - | `from` |
| `get_metadata` | `token_id: u32` | `TokenMetadata` | - |
| `balance_of` | `owner: Address` | `u32` | - |
| `total_supply` | - | `u32` | - |
| `name` | - | `String` | - |
| `symbol` | - | `String` | - |
| `admin` | - | `Address` | - |

### ForgeFactory Contract

| Function | Params | Returns | Auth |
|----------|--------|---------|------|
| `initialize` | `admin: Address, platform_fee_stroops: i128, nft_wasm_hash: BytesN<32>` | - | `admin` |
| `deploy_nft` | `deployer: Address, salt: BytesN<32>, name: String, symbol: String` | `Address` (contract_id) | `deployer` |
| `mint_via_factory` | `minter: Address, nft_contract: Address, to: Address, uri: String` | `u32` (token_id) | `minter` |
| `get_registry` | - | `Map<Address, NftContractInfo>` | - |
| `get_fee_amount` | - | `i128` | - |
| `get_fee_balance` | - | `i128` | - |
| `withdraw_fees` | `to: Address` | `i128` | `admin` |
| `admin` | - | `Address` | - |

---

## Level 3 Submission Checklist

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Advanced smart contracts with inter-contract calls | Done | ForgeFactory calls ForgeNFT mint via cross-contract invocation |
| Dual-contract architecture | Done | ForgeFactory + ForgeNFT with distinct responsibilities |
| Contracts compile to wasm32-unknown-unknown | Done | Rust toolchain pinned with explicit target |
| Instance vs Persistent storage with TTL management | Done | Admin config in instance, token data in persistent with extend_ttl |
| Event emission on state changes | Done | Events published for mint, transfer, deploy, fee collection |
| 3+ distinct unit tests | Done | 7 tests covering happy paths, errors, and cross-contract patterns |
| Mobile-responsive frontend | Done | Fluid grids, hamburger drawer, mobile view pills, touch-optimized |
| Wallet integration (Freighter) | Done | Full connect/disconnect, auth, transaction signing utilities |
| IPFS metadata support | Done | Pinata integration for file + JSON metadata pinning |
| Real-time event streaming | Done | Soroban RPC getEvents polling with custom hook |
| CI/CD pipeline (GitHub Actions) | Done | test-contracts, build-wasm, build-frontend jobs |
| Deployment scripts | Done | deploy.sh automates full deployment workflow |
| Documentation | Done | Architecture diagram, API reference, quickstart, test coverage |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Rust, soroban-sdk v21, wasm32-unknown-unknown |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| UI Components | Radix UI primitives, Lucide Icons |
| Wallet | @stellar/freighter-api |
| Blockchain SDK | @stellar/stellar-sdk (SorobanRpc) |
| IPFS | Pinata API |
| CI/CD | GitHub Actions |
| Testing | soroban-sdk testutils, mock auth |
| Deployment | stellar-cli |

---

## License

MIT
