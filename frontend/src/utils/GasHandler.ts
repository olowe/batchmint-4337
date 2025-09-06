import batchMintTokenFactoryABI from "@/abis/BatchMintTokenFactory";
import entryPointABI from "@/abis/EntryPoint";
import simpleAccountFactoryABI from "@/abis/SimpleAccountFactory";
import { FeeValuesEIP1559, Hex, parseGwei, PublicClient } from "viem";

class GasHandler {
  async estimateSmartAccountCreationGas(
    publicClient: PublicClient,
    simpleAccountFactory: Hex,
    owner: Hex,
    salt: bigint
  ) {
    const gas = await publicClient.estimateContractGas({
      address: simpleAccountFactory,
      abi: simpleAccountFactoryABI,
      functionName: "createAccount",
      args: [owner, salt],
      account: owner,
    });

    return (gas * BigInt(13)) / BigInt(10); // +30% cushion
  }

  async estimateTokenDeploymentGas(
    publicClient: PublicClient,
    batchMintTokenFactory: Hex,
    params: {
      name: string;
      symbol: string;
      totalSupply: bigint;
    }[],
    owner: Hex
  ) {
    const gas = await publicClient.estimateContractGas({
      address: batchMintTokenFactory,
      abi: batchMintTokenFactoryABI,
      functionName: "deployTokens",
      args: [params],
      account: owner,
    });

    return (gas * BigInt(13)) / BigInt(10); // +30% cushion
  }

  async buildGasAndLimits(
    feeData: FeeValuesEIP1559,
    paramsLength: number,
    isNewAccount: boolean
  ) {
    const maxFeePerGas = feeData.maxFeePerGas ?? parseGwei("3");
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? parseGwei("2");

    const verificationGasLimit = isNewAccount
      ? BigInt(2_400_000)
      : BigInt(1_200_000);

    const preVerificationGas =
      BigInt(150_000) + BigInt(paramsLength) * BigInt(21_000);

    return {
      verificationGasLimit,
      preVerificationGas,
      maxFeePerGas,
      maxPriorityFeePerGas,
    };
  }

  async getRequiredDepositForUserOp(
    publicClient: PublicClient,
    entryPoint: Hex,
    smartAccountAddress: Hex,
    verificationGasLimit: bigint,
    preVerificationGas: bigint,
    callGasLimit: bigint,
    maxFeePerGas: bigint
  ) {
    const smartAccountDepositBalance: bigint = await publicClient.readContract({
      address: entryPoint,
      abi: entryPointABI,
      functionName: "balanceOf",
      args: [smartAccountAddress],
    });
    console.log("smartAccountDepositBalance", smartAccountDepositBalance);

    const gasTotal = preVerificationGas + verificationGasLimit + callGasLimit;
    console.log("gasTotal", gasTotal);

    const requiredPrefund = gasTotal * maxFeePerGas;
    console.log("requiredPrefund", requiredPrefund);

    if (smartAccountDepositBalance > requiredPrefund) {
      return undefined;
    }

    const depositDifference = requiredPrefund - smartAccountDepositBalance;
    return (depositDifference * BigInt(110)) / BigInt(100); //+10% cushion
  }
}

export default GasHandler;
