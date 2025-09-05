const localSimpleAccountFactory = process.env
  .NEXT_PUBLIC_LOCAL_SIMPLE_ACCOUNT_FACTORY as `0x${string}`;
const localBatchMintTokenFactory = process.env
  .NEXT_PUBLIC_LOCAL_BATCH_MINT_TOKEN_FACTORY as `0x${string}`;

const testnetSimpleAccountFactory = process.env
  .NEXT_PUBLIC_TESTNET_SIMPLE_ACCOUNT_FACTORY as `0x${string}`;
const testnetBatchMintTokenFactory = process.env
  .NEXT_PUBLIC_TESTNET_BATCH_MINT_TOKEN_FACTORY as `0x${string}`;

interface INetworkContractConfig {
  simpleAccountFactory: `0x${string}`;
  batchMintTokenFactory: `0x${string}`;
}

interface INetworkContractsConfig {
  [key: number]: INetworkContractConfig;
}

const networkContractsConfig: INetworkContractsConfig = {
  31337: {
    simpleAccountFactory: localSimpleAccountFactory,
    batchMintTokenFactory: localBatchMintTokenFactory,
  },
  11155111: {
    simpleAccountFactory: testnetSimpleAccountFactory,
    batchMintTokenFactory: testnetBatchMintTokenFactory,
  },
};

export default networkContractsConfig;
