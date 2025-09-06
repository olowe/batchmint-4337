import { Hex } from "viem";

const localEntryPoint = process.env.NEXT_PUBLIC_LOCAL_ENTRY_POINT as Hex;
const localSimpleAccountFactory = process.env
  .NEXT_PUBLIC_LOCAL_SIMPLE_ACCOUNT_FACTORY as Hex;
const localBatchMintTokenFactory = process.env
  .NEXT_PUBLIC_LOCAL_BATCH_MINT_TOKEN_FACTORY as Hex;

const testnetEntryPoint = process.env.NEXT_PUBLIC_TESTNET_ENTRY_POINT as Hex;
const testnetSimpleAccountFactory = process.env
  .NEXT_PUBLIC_TESTNET_SIMPLE_ACCOUNT_FACTORY as Hex;
const testnetBatchMintTokenFactory = process.env
  .NEXT_PUBLIC_TESTNET_BATCH_MINT_TOKEN_FACTORY as Hex;

interface INetworkContractConfig {
  entryPoint: Hex;
  simpleAccountFactory: Hex;
  batchMintTokenFactory: Hex;
}

interface INetworkContractsConfig {
  [key: number]: INetworkContractConfig;
}

const networkContractsConfig: INetworkContractsConfig = {
  31337: {
    entryPoint: localEntryPoint,
    simpleAccountFactory: localSimpleAccountFactory,
    batchMintTokenFactory: localBatchMintTokenFactory,
  },
  11155111: {
    entryPoint: testnetEntryPoint,
    simpleAccountFactory: testnetSimpleAccountFactory,
    batchMintTokenFactory: testnetBatchMintTokenFactory,
  },
};

export default networkContractsConfig;
