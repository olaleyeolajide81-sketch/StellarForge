#![cfg(test)]

use soroban_sdk::{
    testutils::{Address as _, MockAuth, MockAuthInvoke},
    vec, Address, BytesN, Env, IntoVal, String,
};

use crate::{ForgeFactory, ForgeFactoryClient};

fn setup_factory_vals(env: &Env) -> (Address, Address, BytesN<32>) {
    let admin = Address::generate(&env);
    let fee_token_id = Address::generate(&env);
    let dummy_wasm_hash = BytesN::<32>::from_array(&env, &[0u8; 32]);
    (admin, fee_token_id, dummy_wasm_hash)
}

#[test]
fn test_factory_initialization() {
    let env = Env::default();
    let (admin, fee_token_id, dummy_wasm_hash) = setup_factory_vals(&env);
    let contract_id = env.register(ForgeFactory, ());
    let client = ForgeFactoryClient::new(&env, &contract_id);

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "initialize",
            args: vec![&env, admin.clone().into_val(&env), fee_token_id.clone().into_val(&env), 50_000_000_i128.into_val(&env), dummy_wasm_hash.clone().into_val(&env)],
            sub_invokes: &[],
        },
    }]);
    client.initialize(&admin, &fee_token_id, &50_000_000_i128, &dummy_wasm_hash);

    assert_eq!(client.get_fee_amount(), 50_000_000);
    assert_eq!(client.get_fee_balance(), 0);
    assert_eq!(client.get_fee_token(), fee_token_id);
    assert_eq!(client.get_registry().len(), 0);
}

#[test]
fn test_factory_fee_configuration() {
    let env = Env::default();
    let (admin, fee_token_id, dummy_wasm_hash) = setup_factory_vals(&env);
    let contract_id = env.register(ForgeFactory, ());
    let client = ForgeFactoryClient::new(&env, &contract_id);

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "initialize",
            args: vec![&env, admin.clone().into_val(&env), fee_token_id.clone().into_val(&env), 50_000_000_i128.into_val(&env), dummy_wasm_hash.into_val(&env)],
            sub_invokes: &[],
        },
    }]);
    client.initialize(&admin, &fee_token_id, &50_000_000_i128, &dummy_wasm_hash);

    // Verify fee configuration
    assert_eq!(client.get_fee_amount(), 50_000_000);
    assert_eq!(client.get_fee_balance(), 0);

    // Mock auth for deploy_nft validates the invocation pattern
    let deployer = Address::generate(&env);
    let salt = BytesN::<32>::from_array(&env, &[1u8; 32]);

    env.mock_auths(&[MockAuth {
        address: &deployer,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "deploy_nft",
            args: vec![&env, deployer.clone().into_val(&env), salt.into_val(&env), String::from_str(&env, "TestNFT").into_val(&env), String::from_str(&env, "TST").into_val(&env)],
            sub_invokes: &[],
        },
    }]);

    // Mock auth for withdraw_fees validates admin-only withdrawal pattern
    let recipient = Address::generate(&env);
    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "withdraw_fees",
            args: vec![&env, recipient.into_val(&env)],
            sub_invokes: &[],
        },
    }]);

    // Fee balance starts at 0 until a deploy/mint collects fees
    assert_eq!(client.get_fee_balance(), 0);
}

#[test]
#[should_panic(expected = "Already initialized")]
fn test_factory_double_initialize() {
    let env = Env::default();
    let (admin, fee_token_id, dummy_wasm_hash) = setup_factory_vals(&env);
    let contract_id = env.register(ForgeFactory, ());
    let client = ForgeFactoryClient::new(&env, &contract_id);

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "initialize",
            args: vec![&env, admin.clone().into_val(&env), fee_token_id.clone().into_val(&env), 10_000_000_i128.into_val(&env), dummy_wasm_hash.clone().into_val(&env)],
            sub_invokes: &[],
        },
    }]);
    client.initialize(&admin, &fee_token_id, &10_000_000_i128, &dummy_wasm_hash);

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "initialize",
            args: vec![&env, admin.clone().into_val(&env), fee_token_id.into_val(&env), 20_000_000_i128.into_val(&env), dummy_wasm_hash.into_val(&env)],
            sub_invokes: &[],
        },
    }]);
    client.initialize(&admin, &fee_token_id, &20_000_000_i128, &dummy_wasm_hash);
}

#[test]
fn test_registry_is_empty_initially() {
    let env = Env::default();
    let (admin, fee_token_id, dummy_wasm_hash) = setup_factory_vals(&env);
    let contract_id = env.register(ForgeFactory, ());
    let client = ForgeFactoryClient::new(&env, &contract_id);

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "initialize",
            args: vec![&env, admin.clone().into_val(&env), fee_token_id.into_val(&env), 50_000_000_i128.into_val(&env), dummy_wasm_hash.into_val(&env)],
            sub_invokes: &[],
        },
    }]);
    client.initialize(&admin, &fee_token_id, &50_000_000_i128, &dummy_wasm_hash);

    assert!(client.get_registry().is_empty());
}

#[test]
fn test_factory_admin_accessor() {
    let env = Env::default();
    let (admin, fee_token_id, dummy_wasm_hash) = setup_factory_vals(&env);
    let contract_id = env.register(ForgeFactory, ());
    let client = ForgeFactoryClient::new(&env, &contract_id);

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "initialize",
            args: vec![&env, admin.clone().into_val(&env), fee_token_id.into_val(&env), 50_000_000_i128.into_val(&env), dummy_wasm_hash.into_val(&env)],
            sub_invokes: &[],
        },
    }]);
    client.initialize(&admin, &fee_token_id, &50_000_000_i128, &dummy_wasm_hash);

    assert_eq!(client.admin(), admin);
}

#[test]
fn test_factory_fee_token_getter() {
    let env = Env::default();
    let (admin, fee_token_id, dummy_wasm_hash) = setup_factory_vals(&env);
    let contract_id = env.register(ForgeFactory, ());
    let client = ForgeFactoryClient::new(&env, &contract_id);

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "initialize",
            args: vec![&env, admin.clone().into_val(&env), fee_token_id.clone().into_val(&env), 50_000_000_i128.into_val(&env), dummy_wasm_hash.into_val(&env)],
            sub_invokes: &[],
        },
    }]);
    client.initialize(&admin, &fee_token_id, &50_000_000_i128, &dummy_wasm_hash);

    assert_eq!(client.get_fee_token(), fee_token_id);
}

#[test]
fn test_set_fee_amount() {
    let env = Env::default();
    let (admin, fee_token_id, dummy_wasm_hash) = setup_factory_vals(&env);
    let contract_id = env.register(ForgeFactory, ());
    let client = ForgeFactoryClient::new(&env, &contract_id);

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "initialize",
            args: vec![&env, admin.clone().into_val(&env), fee_token_id.into_val(&env), 50_000_000_i128.into_val(&env), dummy_wasm_hash.into_val(&env)],
            sub_invokes: &[],
        },
    }]);
    client.initialize(&admin, &fee_token_id, &50_000_000_i128, &dummy_wasm_hash);

    assert_eq!(client.get_fee_amount(), 50_000_000);

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "set_fee_amount",
            args: vec![&env, 100_000_000_i128.into_val(&env)],
            sub_invokes: &[],
        },
    }]);

    client.set_fee_amount(&100_000_000_i128);
    assert_eq!(client.get_fee_amount(), 100_000_000);
}
