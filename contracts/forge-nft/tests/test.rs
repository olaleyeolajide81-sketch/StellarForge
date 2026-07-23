#![cfg(test)]

use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, MockAuth, MockAuthInvoke},
    Address, Env, IntoVal,
};

use forge_nft::{ForgeNFT, ForgeNFTClient, TokenMetadata};

/// Creates a test environment with initialized NFT contract.
fn setup_nft<'a>(env: &Env) -> (ForgeNFTClient<'a>, Address) {
    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, ForgeNFT);
    let client = ForgeNFTClient::new(&env, &contract_id);

    client.initialize(&admin, &"ForgeNFT".into_val(&env), &"FNFT".into_val(&env));

    (client, admin)
}

// ─── Test 1: Successful NFT Minting & Balance Updates ──────────────────────

#[test]
fn test_successful_mint_and_balance() {
    let env = Env::default();
    let (client, admin) = setup_nft(&env);

    let user = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://QmTest123/metadata.json");

    // Mock admin auth for minting
    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "mint",
            args: (user.clone(), uri.clone()),
        },
    }]);

    // Mint first token
    let token_id = client.mint(&user, &uri);
    assert_eq!(token_id, 1);

    // Verify balance
    let balance = client.balance_of(&user);
    assert_eq!(balance, 1);

    // Verify total supply
    let supply = client.total_supply();
    assert_eq!(supply, 1);

    // Verify metadata
    let metadata = client.get_metadata(&token_id);
    assert_eq!(metadata.uri, uri);
    assert_eq!(metadata.owner, user);

    // Mint second token
    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "mint",
            args: (user.clone(), uri.clone()),
        },
    }]);

    let token_id2 = client.mint(&user, &uri);
    assert_eq!(token_id2, 2);
    assert_eq!(client.balance_of(&user), 2);
    assert_eq!(client.total_supply(), 2);
}

// ─── Test 2: Unauthorized Transfer Rejection ───────────────────────────────

#[test]
#[should_panic(expected = "Not token owner")]
fn test_unauthorized_transfer_rejected() {
    let env = Env::default();
    let (client, admin) = setup_nft(&env);

    let owner = Address::generate(&env);
    let thief = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://QmTest456/metadata.json");

    // Admin mints token to owner
    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "mint",
            args: (owner.clone(), uri.clone()),
        },
    }]);
    let token_id = client.mint(&owner, &uri);

    // Thief tries to transfer without being the owner
    // Mock auth for thief (they authorize the transfer)
    env.mock_auths(&[MockAuth {
        address: &thief,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "transfer",
            args: (thief.clone(), thief.clone(), token_id),
        },
    }]);

    // This should panic with "Not token owner" since thief doesn't own the token
    client.transfer(&thief, &thief, &token_id);
}

// ─── Test 3: Successful Transfer Between Owners ────────────────────────────

#[test]
fn test_successful_transfer() {
    let env = Env::default();
    let (client, admin) = setup_nft(&env);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://QmTest789/metadata.json");

    // Admin mints to Alice
    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "mint",
            args: (alice.clone(), uri.clone()),
        },
    }]);
    let token_id = client.mint(&alice, &uri);
    assert_eq!(client.balance_of(&alice), 1);
    assert_eq!(client.balance_of(&bob), 0);

    // Alice transfers to Bob
    env.mock_auths(&[MockAuth {
        address: &alice,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "transfer",
            args: (alice.clone(), bob.clone(), token_id),
        },
    }]);
    client.transfer(&alice, &bob, &token_id);

    // Verify balances
    assert_eq!(client.balance_of(&alice), 0);
    assert_eq!(client.balance_of(&bob), 1);

    // Verify new owner in metadata
    let metadata = client.get_metadata(&token_id);
    assert_eq!(metadata.owner, bob);
    assert_eq!(metadata.uri, uri);
}

// ─── Test 4: Double Initialize Protection ───────────────────────────────────

#[test]
#[should_panic(expected = "Already initialized")]
fn test_double_initialize_nft() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, ForgeNFT);
    let client = ForgeNFTClient::new(&env, &contract_id);

    client.initialize(&admin, &"Test".into_val(&env), &"TST".into_val(&env));

    // Second initialize should panic
    client.initialize(&admin, &"Test2".into_val(&env), &"TS2".into_val(&env));
}

// ─── Test 5: Token Does Not Exist Error ────────────────────────────────────

#[test]
#[should_panic(expected = "Token does not exist")]
fn test_get_nonexistent_token() {
    let env = Env::default();
    let (client, _admin) = setup_nft(&env);

    // Try to get metadata for non-existent token
    client.get_metadata(&999);
}
