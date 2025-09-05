"use client";
import batchMintTokenFactoryABI from "@/abis/BatchMintTokenFactory";
import entryPointABI from "@/abis/EntryPoint";
import simpleAccountABI from "@/abis/SimpleAccount";
import simpleAccountFactoryABI from "@/abis/SimpleAccountFactory";
import { useConnectionStatus } from "@/app/ConnectionStatusProvider";
import { useTokenFormProvider } from "@/app/TokenFormProvider";
import useSmartAccount from "@/hooks/useSmartAccount";
import networkContractsConfig from "@/wallet/network-contracts.config";
import { createContext, PropsWithChildren, useContext } from "react";
import { encodeFunctionData, encodePacked } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

interface ITokenDeployerContext {
  deployTokens: () => Promise<void>;
}

const Context = createContext<ITokenDeployerContext>({
  deployTokens: async () => {},
});

export const useTokenDeployer = () =>
  useContext<ITokenDeployerContext>(Context);

export default function TokenDeploymentProvider(props: PropsWithChildren) {
  const { chainId, address: userEOA } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { isConnectionSupported } = useConnectionStatus();
  const smartAccountAddress = useSmartAccount();
  const { tokenPreview } = useTokenFormProvider();

  console.log("tokenPreview", tokenPreview);

  const entryPoint = isConnectionSupported
    ? networkContractsConfig[chainId as number].entryPoint
    : undefined;

  const simpleAccountFactory = isConnectionSupported
    ? networkContractsConfig[chainId as number].simpleAccountFactory
    : undefined;

  const batchMintTokenFactory = isConnectionSupported
    ? networkContractsConfig[chainId as number].batchMintTokenFactory
    : undefined;

  const getEntryPointPackedUserOpFields = () => {
    const types = {
      PackedUserOperation: [
        { name: "sender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "initCode", type: "bytes" },
        { name: "callData", type: "bytes" },
        { name: "accountGasLimits", type: "bytes32" },
        { name: "preVerificationGas", type: "uint256" },
        { name: "gasFees", type: "bytes32" },
        { name: "paymasterAndData", type: "bytes" },
      ],
    } as const;

    return types;
  };

  const getSmartAccountInitCode = async () => {
    if (
      !publicClient ||
      !smartAccountAddress ||
      !userEOA ||
      !simpleAccountFactory
    ) {
      return;
    }

    const userSmartAccountContractCode = await publicClient.getCode({
      address: smartAccountAddress,
    });
    console.log("userSmartAccountContractCode", userSmartAccountContractCode);
    const shouldDeploySmartAccount = userSmartAccountContractCode === "0x";
    console.log("shouldDeploySmartAccount", shouldDeploySmartAccount);

    //  Encode factory calldata for creating a smart account
    const factoryCalldata = shouldDeploySmartAccount
      ? encodeFunctionData({
          abi: simpleAccountFactoryABI,
          functionName: "createAccount",
          args: [userEOA, BigInt(0)],
        })
      : "0x";
    console.log("factoryCalldata", factoryCalldata);

    // Set initCode for first-time Smart Contract Account creation
    const initCode = shouldDeploySmartAccount
      ? simpleAccountFactory + factoryCalldata.slice(2)
      : "0x";
    console.log("initCode", initCode);

    return initCode;
  };

  const getTokenFactoryCalldata = async () => {
    if (!batchMintTokenFactory) {
      return;
    }
    console.log("batchMintTokenFactory", batchMintTokenFactory);

    //  Encode calldata for deploying tokens
    const params = tokenPreview.map(({ name, symbol, totalSupply }) => ({
      name,
      symbol,
      totalSupply: BigInt(totalSupply),
    }));
    console.log("params", params);

    const deployCalldata = encodeFunctionData({
      abi: batchMintTokenFactoryABI,
      functionName: "deployTokens",
      args: [params],
    });
    console.log("deployCalldata", deployCalldata);

    // Encode calldata for actual smart account operation
    const callData = encodeFunctionData({
      abi: simpleAccountABI,
      functionName: "execute",
      args: [batchMintTokenFactory, BigInt(0), deployCalldata],
    });
    console.log("callData", callData);

    return callData;
  };

  const constructUserOperation = async () => {
    if (!smartAccountAddress || !publicClient || !entryPoint) {
      return;
    }

    const nonce = await publicClient.readContract({
      address: entryPoint,
      abi: entryPointABI,
      functionName: "getNonce",
      args: [smartAccountAddress, BigInt(0)],
    });
    console.log("nonce", nonce);

    const feeData = await publicClient.estimateFeesPerGas();
    const maxFeePerGas = feeData.maxFeePerGas ?? BigInt(1500000);
    const maxPriorityFeePerGas =
      feeData.maxPriorityFeePerGas ?? BigInt(1500000);

    // Pack gas limits: verificationGasLimit (16 bytes) + callGasLimit (16 bytes)
    const accountGasLimits = encodePacked(
      ["uint128", "uint128"],
      [BigInt(1500000), BigInt(1500000)] // [verificationGasLimit, callGasLimit]
    );
    console.log("accountGasLimits", accountGasLimits);

    // Pack gas fees: maxPriorityFeePerGas (16 bytes) + maxFeePerGas (16 bytes)
    const gasFees = encodePacked(
      ["uint128", "uint128"],
      [maxPriorityFeePerGas, maxFeePerGas]
    );
    console.log("gasFees", gasFees);

    const initCode = await getSmartAccountInitCode();
    const callData = await getTokenFactoryCalldata();
    if (!initCode || !callData) {
      return;
    }

    // Construct UserOperation
    const userOp = {
      sender: smartAccountAddress,
      nonce,
      initCode,
      callData,
      accountGasLimits,
      preVerificationGas: BigInt(1500000),
      gasFees,
      paymasterAndData: "0x",
      signature: "0x",
    };

    return userOp;
  };

  const getUserOpHash = async () => {
    const userOp: any = await constructUserOperation();
    console.log("userOp", userOp);

    if (!publicClient || !userOp || !entryPoint || !chainId) {
      return;
    }

    const userOpHash = await publicClient.readContract({
      address: entryPoint,
      abi: entryPointABI,
      functionName: "getUserOpHash",
      args: [userOp],
    });
    console.log("userOpHash", userOpHash);

    return { userOp, userOpHash };
  };

  const signUserOpHash = async (userOp: any) => {
    if (!walletClient || !userEOA || !entryPoint) {
      return;
    }

    const domain = {
      name: "ERC4337",
      version: "1",
      chainId: Number(chainId),
      verifyingContract: entryPoint,
    };

    const signature = await walletClient.signTypedData({
      account: userEOA,
      domain,
      primaryType: "PackedUserOperation",
      types: getEntryPointPackedUserOpFields(),
      message: userOp,
    });
    console.log("signature", signature);

    return signature;
  };

  const deployTokens = async () => {
    console.log(tokenPreview);
    const userOpDetails = await getUserOpHash();

    if (!userOpDetails) {
      return;
    }

    const { userOp, userOpHash } = userOpDetails;
    if (!userOp || !userOpHash) {
      return;
    }

    const userOpHashSignature = await signUserOpHash(userOp);
    if (!userOpHashSignature) {
      return;
    }

    const signedOp = { ...userOp, signature: userOpHashSignature };
    console.log("signedOp", signedOp);

    if (!publicClient || !walletClient || !userEOA || !entryPoint) {
      return;
    }

    try {
      const sim = await publicClient.simulateContract({
        abi: entryPointABI,
        address: entryPoint,
        functionName: "handleOps",
        args: [[signedOp], userEOA],
      });
      const hash = await walletClient.writeContract(sim.request);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("receipt", receipt);
    } catch (error: any) {
      console.log(error.message);
    }
  };

  return (
    <Context.Provider value={{ deployTokens }}>
      {props.children}
    </Context.Provider>
  );
}
