import { Contract, SorobanRpc, TransactionBuilder, xdr } from "@stellar/stellar-sdk";

const RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ||
  "https://soroban-testnet.stellar.org";

const FACTORY_CONTRACT_ID =
  process.env.NEXT_PUBLIC_FORGE_FACTORY_ID ||
  "CA4HEQHQW5MNS3SCFJ5BNYJWBOILNXORBYB3VEFIFGJRBZJITL7XCA7T";

const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_PASSPHRASE ||
  "Test SDF Network ; September 2015";

export const rpc = new SorobanRpc.Server(RPC_URL);
export const networkPassphrase = NETWORK_PASSPHRASE;
export const factoryContractId = FACTORY_CONTRACT_ID;

/**
 * Build and simulate a Soroban contract invocation.
 */
export async function buildContractTx(
  sourcePublicKey: string,
  contractId: string,
  method: string,
  args: xdr.ScVal[]
): Promise<{ xdr: string; result: xdr.ScVal }> {
  const account = await rpc.getAccount(sourcePublicKey);

  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simulated = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simulated)) {
    throw new Error(`Simulation failed: ${simulated.error}`);
  }

  return {
    xdr: simulated.transactionData.toXDR("base64"),
    result: simulated.result!,
  };
}

/**
 * Submit a signed transaction to the network.
 */
export async function submitTransaction(
  signedXdr: string
): Promise<SorobanRpc.Api.SendTransactionResponse> {
  const tx = TransactionBuilder.fromXDR(
    signedXdr,
    networkPassphrase
  ) as any;

  const response = await rpc.sendTransaction(tx);
  if (response.status === "ERROR") {
    throw new Error(`Transaction failed: ${JSON.stringify(response)}`);
  }
  return response;
}

/**
 * Poll for Soroban contract events.
 */
export async function getContractEvents(
  contractId: string,
  startLedger?: number,
  topicFilter?: string
): Promise<SorobanRpc.Api.GetEventsResponse> {
  const filters: SorobanRpc.Api.EventFilter[] = [
    {
      contractIds: [contractId],
      type: "contract",
      topics: topicFilter ? [[topicFilter]] : undefined,
    },
  ];

  const response = await rpc.getEvents({
    startLedger,
    filters,
    limit: 50,
  });

  return response;
}
