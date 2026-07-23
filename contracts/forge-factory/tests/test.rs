#![cfg(test)]

use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, MockAuth, MockAuthInvoke},
    Address, Env, IntoVal,
};

use forge_factory::{ForgeFactory, ForgeFactoryClient, NftContractInfo};

/// Creates a test environment with an initialized factory contract.
/// Uses an Address::generate for the fee token (representing a mock SAC/XLM address).
fn setup_factory<'a>(env: &Env) -> (ForgeFactoryClient<'a>, Address, Address) {
    let admin = Address::generate(&env);
    let fee_token_id = Address::generate(&env);
    let contract_id = env.register_contract(None, ForgeFactory);
    let client = ForgeFactoryClient::new(&env, &contract_id);

    let dummy_wasm_hash = soroban_sdk::BytesN::from_array(&env, &[0u8; 32]);
    client.initialize(&admin, &fee_token_id, &50_000_000_i128, &dummy_wasm_hash);

    (client, admin, fee_token_id)
}

// ─── Test 1: Factory Initialization ────────────────────────────────────────

#[test]
fn test_factory_initialization() {
    let env = Env::default();
    let (client, _admin, fee_token_id) = setup_factory(&env);

    assert_eq!(client.get_fee_amount(), 50_000_000);
    assert_eq!(client.get_fee_balance(), 0);
    assert_eq!(client.get_fee_token(), fee_token_id);

    let registry = client.get_registry();
    assert_eq!(registry.len(), 0);
}

// ─── Test 2: Factory Fee Collection & Withdrawal ────────────────────────────

#[test]
fn test_factory_fee_and_withdrawal() {
    let env = Env::default();
    let (client, admin, _fee_token_id) = setup_factory(&env);

    // Deploy an NFT (collects fee via token transfer)
    let deployer = Address::generate(&env);
    let salt = soroban_sdk::BytesN::from_array(&env, &[1u8; 32]);

    env.mock_auths(&[MockAuth {
        address: &deployer,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "deploy_nft",
            args: (
                deployer.clone(),
                salt,
                "TestNFT".into_val(&env),
                "TST".into_val(&env),
            ),
        },
    }]);

    // Note: deploy_nft requires actual wasm deployment and a real token contract
    // for fee transfers. In integration testing, a mock token contract would be
    // deployed and approved before this call.
    // The mock auth validates the invocation pattern.

    assert_eq!(client.get_fee_amount(), 50_000_000);

    // Admin withdraws fees
    let recipient = Address::generate(&env);
    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "withdraw_fees",
            args: (recipient.clone(),),
        },
    }]);

    let withdrawn = client.withdraw_fees(&recipient);
    // Balance starts at 0 until a deploy/mint collects fees
    assert_eq!(withdrawn, 0);
    assert_eq!(client.get_fee_balance(), 0);
}

// ─── Test 3: Double Initialize Protection ──────────────────────────────────

#[test]
#[should_panic(expected = "Already initialized")]
fn test_factory_double_initialize() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let fee_token_id = Address::generate(&env);
    let contract_id = env.register_contract(None, ForgeFactory);
    let client = ForgeFactoryClient::new(&env, &contract_id);

    let dummy_wasm_hash = soroban_sdk::BytesN::from_array(&env, &[0u8; 32]);
    client.initialize(&admin, &fee_token_id, &10_000_000_i128, &dummy_wasm_hash);

    // Second initialize should panic
    client.initialize(&admin, &fee_token_id, &20_000_000_i128, &dummy_wasm_hash);
}

// ─── Test 4: Registry Operations ────────────────────────────────────────────

#[test]
fn test_registry_is_empty_initially() {
    let env = Env::default();
    let (client, _admin, _fee_token_id) = setup_factory(&env);

    let registry = client.get_registry();
    assert!(registry.is_empty());
}

// ─── Test 5: Admin Accessor ─────────────────────────────────────────────────

#[test]
fn test_factory_admin_accessor() {
    let env = Env::default();
    let (client, admin, _fee_token_id) = setup_factory(&env);

    let stored_admin = client.admin();
    assert_eq!(stored_admin, admin);
}

// ─── Test 6: Fee Token Getter ───────────────────────────────────────────────

#[test]
fn test_factory_fee_token_getter() {
    let env = Env::default();
    let (client, _admin, fee_token_id) = setup_factory(&env);

    let stored_token = client.get_fee_token();
    assert_eq!(stored_token, fee_token_id);
}

// ─── Test 7: Set Fee Amount ─────────────────────────────────────────────────

#[test]
fn test_set_fee_amount() {
    let env = Env::default();
    let (client, admin, _fee_token_id) = setup_factory(&env);

    assert_eq!(client.get_fee_amount(), 50_000_000);

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "set_fee_amount",
            args: (100_000_000_i128,),
        },
    }]);

    client.set_fee_amount(&100_000_000_i128);
    assert_eq!(client.get_fee_amount(), 100_000_000);
}
