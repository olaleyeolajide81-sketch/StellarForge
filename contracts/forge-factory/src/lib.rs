#![no_std]

#[cfg(test)]
mod test;

use soroban_sdk::{
    contract, contractclient, contractimpl, contracttype, symbol_short, token, Address, BytesN, Env,
    Map, String, Symbol, Val,
};

// ─── Storage Keys ───────────────────────────────────────────────────────────

const ADMIN_KEY: Symbol = symbol_short!("ADMIN");
const FEE_BALANCE_KEY: Symbol = symbol_short!("FEE_BAL");
const FEE_AMOUNT_KEY: Symbol = symbol_short!("FEE_AMT");
const FEE_TOKEN_KEY: Symbol = symbol_short!("FEE_TOK");
const REGISTRY_KEY: Symbol = symbol_short!("REGISTRY");
const NFT_WASM_HASH_KEY: Symbol = symbol_short!("NFT_WASM");

// ─── Data Types ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NftContractInfo {
    pub contract_id: Address,
    pub name: String,
    pub deployed_by: Address,
}

// ─── ForgeNFT Client (for inter-contract calls) ─────────────────────────────

#[contractclient(name = "ForgeNftClient")]
pub trait ForgeNftTrait {
    fn initialize(admin: Address, name: String, symbol: String);
    fn mint(to: Address, uri: String) -> u32;
    fn transfer(from: Address, to: Address, token_id: u32);
    fn get_metadata(token_id: u32) -> Val;
    fn balance_of(owner: Address) -> u32;
    fn total_supply() -> u32;
}

// ─── Main Contract ──────────────────────────────────────────────────────────

#[contract]
pub struct ForgeFactory;

#[contractimpl]
impl ForgeFactory {
    /// Initialize the factory with admin, fee token address, platform fee, and NFT Wasm hash.
    ///
    /// `fee_token_id` is the address of the token used for fees (e.g., the Stellar
    /// Asset Contract for native XLM). Users must approve this factory contract to
    /// spend their tokens before calling fee-charging operations.
    pub fn initialize(
        env: Env,
        admin: Address,
        fee_token_id: Address,
        platform_fee_stroops: i128,
        nft_wasm_hash: BytesN<32>,
    ) {
        admin.require_auth();

        if env.storage().instance().has(&ADMIN_KEY) {
            panic!("Already initialized");
        }

        env.storage().instance().set(&ADMIN_KEY, &admin);
        env.storage().instance().set(&FEE_TOKEN_KEY, &fee_token_id);
        env.storage()
            .instance()
            .set(&FEE_AMOUNT_KEY, &platform_fee_stroops);
        env.storage().instance().set(&FEE_BALANCE_KEY, &0i128);
        env.storage().instance().set(&NFT_WASM_HASH_KEY, &nft_wasm_hash);

        // Initialize empty registry
        let empty_registry: Map<Address, NftContractInfo> = Map::new(&env);
        env.storage().instance().set(&REGISTRY_KEY, &empty_registry);

        env.storage()
            .instance()
            .extend_ttl(3110400, 3110400);
    }

    /// Deploy a new ForgeNFT contract and register it in the factory.
    /// Collects the platform fee from the deployer via token transfer.
    /// Returns the contract ID of the newly deployed NFT contract.
    ///
    /// **Prerequisite**: The `deployer` must have called `approve()` on the fee
    /// token contract, authorizing this factory to spend `platform_fee_stroops`
    /// of their tokens.
    pub fn deploy_nft(
        env: Env,
        deployer: Address,
        salt: BytesN<32>,
        name: String,
        symbol: String,
    ) -> Address {
        deployer.require_auth();

        let nft_wasm_hash: BytesN<32> = env
            .storage()
            .instance()
            .get(&NFT_WASM_HASH_KEY)
            .expect("Factory not initialized: missing NFT Wasm hash");

        // Collect platform fee via real token transfer
        self::collect_platform_fee(&env, &deployer);

        // Deploy the NFT contract using the stored Wasm hash
        // Pass salt and wasm_hash by value for soroban-sdk v22 deploy API
        let deployer_with_salt = env.deployer().with_current_contract(salt);
        let nft_contract_id = deployer_with_salt.deploy(nft_wasm_hash);

        // Initialize the deployed NFT contract (cross-contract call)
        // The factory is set as admin so it can mint via cross-contract calls.
        // The deployer is tracked separately in the registry.
        let factory_address = env.current_contract_address();
        let nft_client = ForgeNftClient::new(&env, &nft_contract_id);
        nft_client.initialize(&factory_address, &name, &symbol);

        // Register in factory registry
        let mut registry: Map<Address, NftContractInfo> = env
            .storage()
            .instance()
            .get(&REGISTRY_KEY)
            .unwrap();

        let info = NftContractInfo {
            contract_id: nft_contract_id.clone(),
            name: name.clone(),
            deployed_by: deployer.clone(),
        };
        registry.set(nft_contract_id.clone(), info);
        env.storage().instance().set(&REGISTRY_KEY, &registry);

        // Emit event
        env.events().publish(
            (
                symbol_short!("deploy"),
                deployer,
                nft_contract_id.clone(),
            ),
            name,
        );

        nft_contract_id
    }

    /// Mint an NFT via the factory using an already-deployed NFT contract.
    /// The factory collects a platform fee from the minter and delegates
    /// the mint to the NFT contract via cross-contract call.
    ///
    /// **Prerequisite**: The `minter` must have called `approve()` on the fee
    /// token contract, authorizing this factory to spend `platform_fee_stroops`
    /// of their tokens.
    pub fn mint_via_factory(
        env: Env,
        minter: Address,
        nft_contract: Address,
        to: Address,
        uri: String,
    ) -> u32 {
        minter.require_auth();

        // Verify the NFT contract is registered in the factory
        let registry: Map<Address, NftContractInfo> = env
            .storage()
            .instance()
            .get(&REGISTRY_KEY)
            .unwrap();

        if !registry.contains_key(nft_contract.clone()) {
            panic!("NFT contract not registered in factory");
        }

        // Collect platform fee via real token transfer
        self::collect_platform_fee(&env, &minter);

        // Cross-contract call: delegate minting to the NFT contract
        let nft_client = ForgeNftClient::new(&env, &nft_contract);
        let token_id = nft_client.mint(&to, &uri);

        // Emit event
        env.events().publish(
            (
                symbol_short!("mint_fac"),
                minter,
                nft_contract,
                token_id,
            ),
            uri,
        );

        token_id
    }

    /// Get the list of all registered NFT contracts.
    pub fn get_registry(env: Env) -> Map<Address, NftContractInfo> {
        env.storage()
            .instance()
            .get(&REGISTRY_KEY)
            .unwrap_or_else(|| Map::new(&env))
    }

    /// Get the platform fee amount (in stroops).
    pub fn get_fee_amount(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&FEE_AMOUNT_KEY)
            .unwrap_or(0)
    }

    /// Get the fee token contract ID.
    pub fn get_fee_token(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&FEE_TOKEN_KEY)
            .unwrap()
    }

    /// Get the accumulated fee balance tracked internally.
    pub fn get_fee_balance(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&FEE_BALANCE_KEY)
            .unwrap_or(0)
    }

    /// Admin can withdraw accumulated fees to any address.
    /// Transfers the full XLM balance from this contract to `to`.
    pub fn withdraw_fees(env: Env, to: Address) -> i128 {
        let admin: Address = env.storage().instance().get(&ADMIN_KEY).unwrap();
        admin.require_auth();

        let fee_token_id: Address = env
            .storage()
            .instance()
            .get(&FEE_TOKEN_KEY)
            .unwrap();

        // Get the actual token balance held by this contract
        let token_client = token::Client::new(&env, &fee_token_id);
        let contract_address = env.current_contract_address();
        let balance = token_client.balance(&contract_address);

        if balance > 0 {
            // Transfer the full balance to the recipient
            token_client.transfer(&contract_address, &to, &balance);

            // Reset internal tracking
            env.storage().instance().set(&FEE_BALANCE_KEY, &0i128);

            // Emit event
            env.events()
                .publish((symbol_short!("fee_withd"), to, balance), ());
        }

        balance
    }

    /// Update the platform fee amount. Admin only.
    pub fn set_fee_amount(env: Env, new_fee: i128) {
        let admin: Address = env.storage().instance().get(&ADMIN_KEY).unwrap();
        admin.require_auth();
        env.storage().instance().set(&FEE_AMOUNT_KEY, &new_fee);

        env.events()
            .publish((symbol_short!("fee_set"), new_fee), ());
    }

    /// Get the admin address.
    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&ADMIN_KEY).unwrap()
    }
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

/// Collect platform fee from `payer` via cross-contract token transfer.
///
/// Uses `transfer_from` on the configured fee token (e.g., SAC for XLM).
/// The payer must have previously called `approve()` on the token contract
/// to authorize this factory as a spender.
fn collect_platform_fee(env: &Env, payer: &Address) {
    let fee: i128 = env
        .storage()
        .instance()
        .get(&FEE_AMOUNT_KEY)
        .unwrap_or(0);

    if fee > 0 {
        let fee_token_id: Address = env
            .storage()
            .instance()
            .get(&FEE_TOKEN_KEY)
            .unwrap();

        let token_client = token::Client::new(env, &fee_token_id);
        let factory_address = env.current_contract_address();

        // Transfer tokens from payer to this factory contract
        // Requires prior approval from payer via token_client.approve()
        token_client.transfer_from(
            &factory_address, // spender (this factory)
            payer,             // from (the user)
            &factory_address,  // to (this factory)
            &fee,              // amount
        );

        // Update internal tracking
        let current_balance: i128 = env
            .storage()
            .instance()
            .get(&FEE_BALANCE_KEY)
            .unwrap_or(0);

        env.storage()
            .instance()
            .set(&FEE_BALANCE_KEY, &(current_balance + fee));

        // Emit event
        env.events()
            .publish((symbol_short!("fee_coll"), payer.clone(), fee), ());
    }
}
