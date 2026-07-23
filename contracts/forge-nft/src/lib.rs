#![no_std]

#[cfg(test)]
mod test;

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol,
};

// ─── Storage Keys ───────────────────────────────────────────────────────────

const ADMIN_KEY: Symbol = symbol_short!("ADMIN");
const NAME_KEY: Symbol = symbol_short!("NAME");
const SYMBOL_KEY: Symbol = symbol_short!("SYM");
const TOTAL_SUPPLY_KEY: Symbol = symbol_short!("SUPPLY");

// ─── Data Types ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TokenMetadata {
    pub uri: String,
    pub owner: Address,
}

/// Enum used as persistent storage keys for token data and balances.
/// Using `#[contracttype]` enums ensures efficient SCVal serialization
/// and avoids dynamic string formatting for storage keys.
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DataKey {
    Token(u32),
    Balance(Address),
}

// ─── Contract ───────────────────────────────────────────────────────────────

#[contract]
pub struct ForgeNFT;

#[contractimpl]
impl ForgeNFT {
    /// Initialize the NFT contract with admin, name, and symbol.
    /// Can only be called once.
    pub fn initialize(env: Env, admin: Address, name: String, symbol: String) {
        admin.require_auth();

        if env.storage().instance().has(&ADMIN_KEY) {
            panic!("Already initialized");
        }

        env.storage().instance().set(&ADMIN_KEY, &admin);
        env.storage().instance().set(&NAME_KEY, &name);
        env.storage().instance().set(&SYMBOL_KEY, &symbol);
        env.storage()
            .instance()
            .set(&TOTAL_SUPPLY_KEY, &0u32);

        // Extend instance TTL
        env.storage()
            .instance()
            .extend_ttl(3110400, 3110400); // ~60 days
    }

    /// Mint a new NFT token to `to` with given `uri` metadata.
    /// Emits a `mint` event with (token_id, to).
    pub fn mint(env: Env, to: Address, uri: String) -> u32 {
        let admin: Address = env.storage().instance().get(&ADMIN_KEY).unwrap();
        admin.require_auth();

        let current_supply: u32 = env.storage().instance().get(&TOTAL_SUPPLY_KEY).unwrap_or(0);
        let token_id = current_supply + 1;

        let metadata = TokenMetadata {
            uri,
            owner: to.clone(),
        };

        // Store token data in persistent storage using DataKey enum
        let token_key = DataKey::Token(token_id);
        env.storage().persistent().set(&token_key, &metadata);

        // Update owner balance
        let balance_key = DataKey::Balance(to.clone());
        let balance: u32 = env.storage().persistent().get(&balance_key).unwrap_or(0);
        env.storage().persistent().set(&balance_key, &(balance + 1));

        // Update total supply
        env.storage().instance().set(&TOTAL_SUPPLY_KEY, &token_id);

        // Extend TTL for persistent entries
        env.storage().persistent().extend_ttl(&token_key, 3110400, 3110400);
        env.storage().persistent().extend_ttl(&balance_key, 3110400, 3110400);

        // Emit event
        env.events()
            .publish((symbol_short!("mint"), to, token_id), ());

        token_id
    }

    /// Transfer a token from `from` to `to`.
    /// `from` must authorize the transfer.
    pub fn transfer(env: Env, from: Address, to: Address, token_id: u32) {
        from.require_auth();

        // Prevent self-transfer
        if from == to {
            panic!("Cannot transfer to self");
        }

        let token_key = DataKey::Token(token_id);
        let mut metadata: TokenMetadata = env
            .storage()
            .persistent()
            .get(&token_key)
            .unwrap_or_else(|| panic!("Token does not exist"));

        // Validate ownership
        if metadata.owner != from {
            panic!("Not token owner");
        }

        // Update ownership
        metadata.owner = to.clone();
        env.storage().persistent().set(&token_key, &metadata);

        // Update balances
        let from_bal_key = DataKey::Balance(from.clone());
        let from_bal: u32 = env.storage().persistent().get(&from_bal_key).unwrap_or(0);
        if from_bal == 0 {
            panic!("No tokens to transfer");
        }
        env.storage().persistent().set(&from_bal_key, &(from_bal - 1));

        let to_bal_key = DataKey::Balance(to.clone());
        let to_bal: u32 = env.storage().persistent().get(&to_bal_key).unwrap_or(0);
        env.storage().persistent().set(&to_bal_key, &(to_bal + 1));

        // Extend TTLs
        env.storage().persistent().extend_ttl(&token_key, 3110400, 3110400);
        env.storage().persistent().extend_ttl(&from_bal_key, 3110400, 3110400);
        env.storage().persistent().extend_ttl(&to_bal_key, 3110400, 3110400);

        // Emit event
        env.events()
            .publish((symbol_short!("transfer"), from, to, token_id), ());
    }

    /// Get metadata URI and owner for a token.
    pub fn get_metadata(env: Env, token_id: u32) -> TokenMetadata {
        let token_key = DataKey::Token(token_id);
        env.storage()
            .persistent()
            .get(&token_key)
            .unwrap_or_else(|| panic!("Token does not exist"))
    }

    /// Get the number of tokens owned by `owner`.
    pub fn balance_of(env: Env, owner: Address) -> u32 {
        let balance_key = DataKey::Balance(owner);
        env.storage().persistent().get(&balance_key).unwrap_or(0)
    }

    /// Get the total supply (number of tokens minted).
    pub fn total_supply(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&TOTAL_SUPPLY_KEY)
            .unwrap_or(0)
    }

    /// Get the contract name.
    pub fn name(env: Env) -> String {
        env.storage().instance().get(&NAME_KEY).unwrap()
    }

    /// Get the contract symbol.
    pub fn symbol(env: Env) -> String {
        env.storage().instance().get(&SYMBOL_KEY).unwrap()
    }

    /// Get the admin address.
    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&ADMIN_KEY).unwrap()
    }
}


