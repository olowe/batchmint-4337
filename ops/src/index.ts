import 'dotenv/config';
import {ethers} from 'ethers';
import batchMintTokenFactory from '../abis/BatchMintTokenFactory.json' with {type: 'json'};
import entryPoint from '../abis/EntryPoint.json' with {type: 'json'};
import simpleAccount from '../abis/SimpleAccount.json' with {type: 'json'};
import simpleAccountFactory from '../abis/SimpleAccountFactory.json' with {type: 'json'};

// Anvil RPC
const RPC_URL = 'http://127.0.0.1:8545';

// EOA that owns the SimpleAccount
const PRIVATE_KEY = process.env.EOA_PRIVATE_KEY as string;

// Deployed EntryPoint address
const ENTRY_POINT = process.env.ENTRY_POINT as string;

// Deployed SimpleAccountFactory address
const SIMPLE_ACCOUNT_FACTORY = process.env.SIMPLE_ACCOUNT_FACTORY as string;

// Deployed BatchMintTokenFactory address
const BATCH_MINT_TOKEN_FACTORY = process.env.BATCH_MINT_TOKEN_FACTORY as string;

// SimpleAccountFactory userSmartAccount salt
const SALT = 0n;

// ABIs
const {abi: entryPointABI} = entryPoint;
const {abi: simpleAccountABI} = simpleAccount;
const {abi: simpleAccountFactoryABI} = simpleAccountFactory;
const {abi: batchMintTokenFactoryABI} = batchMintTokenFactory;

// Types
interface TokenParam {
  name: string;
  symbol: string;
  totalSupply: bigint;
}

// Packed UserOperation
interface UserOperation {
  sender: string;
  nonce: bigint;
  initCode: string;
  callData: string;
  accountGasLimits: string; // bytes32
  preVerificationGas: bigint;
  gasFees: string; // bytes32
  paymasterAndData: string;
  signature: string;
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const entryPointContract = new ethers.Contract(
    ENTRY_POINT,
    entryPointABI,
    wallet,
  );

  const simpleAccountFactoryContract = new ethers.Contract(
    SIMPLE_ACCOUNT_FACTORY,
    simpleAccountFactoryABI,
    wallet,
  );
  const simpleAccountInterface = new ethers.Interface(simpleAccountABI);

  const batchMintTokenFactoryInterface = new ethers.Interface(
    batchMintTokenFactoryABI,
  );

  // STAGE 1
  // Setup user
  const userEOA = await wallet.getAddress();
  console.log('userEOA', userEOA);

  // Derive smart account address
  const userSmartAccount = await simpleAccountFactoryContract.getFunction(
    'getAddress',
  )(userEOA, SALT);
  console.log('userSmartAccount', userSmartAccount);

  // Fund smart account
  console.log('Funding userSmartAccount...');
  const fundTx = await wallet.sendTransaction({
    to: userSmartAccount,
    value: ethers.parseEther('1'),
  });
  await fundTx.wait();
  console.log('Funded userSmartAccount...');

  // STAGE 2
  // Check smart account status
  const userSmartAccountContractCode = await provider.getCode(userSmartAccount);
  const shouldDeploySmartAccount = userSmartAccountContractCode === '0x';

  //  Encode factory calldata
  const factoryCalldata = shouldDeploySmartAccount
    ? simpleAccountFactoryContract.interface.encodeFunctionData(
        'createAccount',
        [userEOA, SALT],
      )
    : '0x';

  // Set initCode for first-time Smart Contract Account creation
  const initCode = shouldDeploySmartAccount
    ? SIMPLE_ACCOUNT_FACTORY + factoryCalldata.slice(2)
    : '0x';

  // STAGE 3
  //  Encode calldata for deploying tokens
  const params: TokenParam[] = [
    {name: 'FirstToken', symbol: 'FIRST', totalSupply: 100000n},
    {name: 'SecondToken', symbol: 'SECOND', totalSupply: 200000n},
  ];

  const deployCalldata = batchMintTokenFactoryInterface.encodeFunctionData(
    'deployTokens',
    [params],
  );

  // Encode calldata for actual smart account operation
  const callData = simpleAccountInterface.encodeFunctionData('execute', [
    BATCH_MINT_TOKEN_FACTORY,
    0,
    deployCalldata,
  ]);

  // STAGE 4
  // Set UserOperation fields
  const nonce = await entryPointContract.getFunction('getNonce')(
    userSmartAccount,
    0,
  );
  console.log('nonce', nonce);

  const feeData = await provider.getFeeData();
  const maxFeePerGas = feeData.maxFeePerGas ?? ethers.parseUnits('30', 'gwei');
  const maxPriorityFeePerGas =
    feeData.maxPriorityFeePerGas ?? ethers.parseUnits('15', 'gwei');

  // Pack gas limits: verificationGasLimit (16 bytes) + callGasLimit (16 bytes)
  const accountGasLimits = ethers.solidityPacked(
    ['uint128', 'uint128'],
    [300_000n, 1_000_000n], // [verificationGasLimit, callGasLimit]
  );

  // Pack gas fees: maxPriorityFeePerGas (16 bytes) + maxFeePerGas (16 bytes)
  const gasFees = ethers.solidityPacked(
    ['uint128', 'uint128'],
    [maxPriorityFeePerGas, maxFeePerGas],
  );

  // Construct UserOperation
  const userOp: UserOperation = {
    sender: userSmartAccount,
    nonce,
    initCode,
    callData,
    accountGasLimits,
    preVerificationGas: 80000n,
    gasFees,
    paymasterAndData: '0x',
    signature: '0x', // placeholder; fill after hashing
  };

  // STAGE 5
  // Get hash of userOp
  const userOpHash: string =
    await entryPointContract.getFunction('getUserOpHash')(userOp);
  console.log('userOpHash', userOpHash);

  // Sign the userOpHash - use raw digest to avoid EIP-712 prefix
  const digestSig = wallet.signingKey.sign(ethers.getBytes(userOpHash));
  const signature = ethers.Signature.from(digestSig).serialized;
  userOp.signature = signature;
  console.log('signature', signature);

  // STAGE 6
  // Relay userOp to EntryPoint
  const pendingNonce = await provider.getTransactionCount(
    wallet.address,
    'pending',
  );
  const tx = await entryPointContract.getFunction('handleOps')(
    [userOp],
    userEOA,
    {nonce: pendingNonce + 1}, // because of earlier fund tx
  );
  console.log('handleOps txHash:', tx.hash);

  const receipt = await tx.wait();
  console.log('Status:', receipt?.status);

  // DONE
  if (receipt?.hash) {
    // Parse events
    for (const log of receipt!.logs) {
      try {
        const parsed = batchMintTokenFactoryInterface.parseLog(
          log,
        ) as ethers.LogDescription;
        if (parsed.name === 'TokenDeployed') {
          const {creator, token, name, symbol} = parsed.args as any;
          console.log('✅ Deployed:', {creator, token, name, symbol});
        }
        if (parsed.name === 'TokenSkipped') {
          const {creator, name, symbol, reason} = parsed.args as any;
          console.log('⚠️ Skipped:', {creator, name, symbol, reason});
        }
      } catch {
        // ignore non-matching logs
      }
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
