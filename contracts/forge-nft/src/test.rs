#![cfg(test)]

use soroban_sdk::{
    testutils::{Address as _, MockAuth, MockAuthInvoke},
    vec, Address, Env, IntoVal, String,
};

use crate::{ForgeNFT, ForgeNFTClient};

#[test]
fn test_successful_mint_and_balance() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(ForgeNFT, ());
    let client = ForgeNFTClient::new(&env, &contract_id);

    let name = String::from_str(&env, "ForgeNFT");
    let symbol = String::from_str(&env, "FNFT");

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "initialize",
            args: vec![&env, admin.clone().into_val(&env), name.clone().into_val(&env), symbol.clone().into_val(&env)],
            sub_invokes: &[],
        },
    }]);
    client.initialize(&admin, &name, &symbol);

    let user = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://QmTest123/metadata.json");

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "mint",
            args: vec![&env, user.clone().into_val(&env), uri.clone().into_val(&env)],
            sub_invokes: &[],
        },
    }]);

    let token_id = client.mint(&user, &uri);
    assert_eq!(token_id, 1);
    assert_eq!(client.balance_of(&user), 1);
    assert_eq!(client.total_supply(), 1);

    let metadata = client.get_metadata(&token_id);
    assert_eq!(metadata.uri, uri);
    assert_eq!(metadata.owner, user);

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "mint",
            args: vec![&env, user.clone().into_val(&env), uri.clone().into_val(&env)],
            sub_invokes: &[],
        },
    }]);

    let token_id2 = client.mint(&user, &uri);
    assert_eq!(token_id2, 2);
    assert_eq!(client.balance_of(&user), 2);
    assert_eq!(client.total_supply(), 2);
}

#[test]
#[should_panic(expected = "Not token owner")]
fn test_unauthorized_transfer_rejected() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(ForgeNFT, ());
    let client = ForgeNFTClient::new(&env, &contract_id);

    let name = String::from_str(&env, "ForgeNFT");
    let symbol = String::from_str(&env, "FNFT");

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "initialize",
            args: vec![&env, admin.clone().into_val(&env), name.into_val(&env), symbol.into_val(&env)],
            sub_invokes: &[],
        },
    }]);
    client.initialize(&admin, &name, &symbol);

    let owner = Address::generate(&env);
    let thief = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://QmTest456/metadata.json");

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "mint",
            args: vec![&env, owner.clone().into_val(&env), uri.clone().into_val(&env)],
            sub_invokes: &[],
        },
    }]);
    let token_id = client.mint(&owner, &uri);

    let receiver = Address::generate(&env);
    env.mock_auths(&[MockAuth {
        address: &thief,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "transfer",
            args: vec![&env, thief.clone().into_val(&env), receiver.clone().into_val(&env), token_id.into_val(&env)],
            sub_invokes: &[],
        },
    }]);

    client.transfer(&thief, &receiver, &token_id);
}

#[test]
fn test_successful_transfer() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(ForgeNFT, ());
    let client = ForgeNFTClient::new(&env, &contract_id);

    let name = String::from_str(&env, "ForgeNFT");
    let symbol = String::from_str(&env, "FNFT");

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "initialize",
            args: vec![&env, admin.clone().into_val(&env), name.into_val(&env), symbol.into_val(&env)],
            sub_invokes: &[],
        },
    }]);
    client.initialize(&admin, &name, &symbol);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://QmTest789/metadata.json");

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "mint",
            args: vec![&env, alice.clone().into_val(&env), uri.clone().into_val(&env)],
            sub_invokes: &[],
        },
    }]);
    let token_id = client.mint(&alice, &uri);
    assert_eq!(client.balance_of(&alice), 1);
    assert_eq!(client.balance_of(&bob), 0);

    env.mock_auths(&[MockAuth {
        address: &alice,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "transfer",
            args: vec![&env, alice.clone().into_val(&env), bob.clone().into_val(&env), token_id.into_val(&env)],
            sub_invokes: &[],
        },
    }]);
    client.transfer(&alice, &bob, &token_id);

    assert_eq!(client.balance_of(&alice), 0);
    assert_eq!(client.balance_of(&bob), 1);

    let metadata = client.get_metadata(&token_id);
    assert_eq!(metadata.owner, bob);
    assert_eq!(metadata.uri, uri);
}

#[test]
#[should_panic(expected = "Already initialized")]
fn test_double_initialize_nft() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(ForgeNFT, ());
    let client = ForgeNFTClient::new(&env, &contract_id);

    let name1 = String::from_str(&env, "Test");
    let symbol1 = String::from_str(&env, "TST");

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "initialize",
            args: vec![&env, admin.clone().into_val(&env), name1.into_val(&env), symbol1.into_val(&env)],
            sub_invokes: &[],
        },
    }]);
    client.initialize(&admin, &name1, &symbol1);

    let name2 = String::from_str(&env, "Test2");
    let symbol2 = String::from_str(&env, "TS2");

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "initialize",
            args: vec![&env, admin.clone().into_val(&env), name2.into_val(&env), symbol2.into_val(&env)],
            sub_invokes: &[],
        },
    }]);
    client.initialize(&admin, &name2, &symbol2);
}

#[test]
#[should_panic(expected = "Token does not exist")]
fn test_get_nonexistent_token() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(ForgeNFT, ());
    let client = ForgeNFTClient::new(&env, &contract_id);

    let name = String::from_str(&env, "ForgeNFT");
    let symbol = String::from_str(&env, "FNFT");

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "initialize",
            args: vec![&env, admin.clone().into_val(&env), name.into_val(&env), symbol.into_val(&env)],
            sub_invokes: &[],
        },
    }]);
    client.initialize(&admin, &name, &symbol);

    client.get_metadata(&999);
}
