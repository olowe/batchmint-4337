"use client";
import batchMintTokenFactoryABI from "@/abis/BatchMintTokenFactory";
import entryPointABI from "@/abis/EntryPoint";
import simpleAccountABI from "@/abis/SimpleAccount";
import simpleAccountFactoryABI from "@/abis/SimpleAccountFactory";
import { useConnectionStatus } from "@/app/ConnectionStatusProvider";
import { useTokenFormProvider } from "@/app/TokenFormProvider";
import useSmartAccount from "@/hooks/useSmartAccount";
import GasHandler from "@/utils/GasHandler";
import networkContractsConfig from "@/wallet/network-contracts.config";
import { createContext, PropsWithChildren, useContext, useState } from "react";
import {
  concatHex,
  encodeFunctionData,
  encodePacked,
  Hex,
  parseEventLogs,
} from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

interface ITokenParam {
  name: string;
  symbol: string;
  totalSupply: bigint;
}

export type TxStage =
  | "idle"
  | "building"
  | "signing"
  | "simulating-prefund"
  | "simulating-handleOps"
  | "submitting-prefund"
  | "submitting-handleOps"
  | "mining-prefund"
  | "mining-handleOps"
  | "success"
  | "error";

interface TxMonitor {
  stage: TxStage;
}

type DeploymentResult = {
  status: string;
  deployedTokens: any[];
  skippedTokens: any[];
  error?: string;
};

interface ITokenDeployerContext {
  deployTokens: () => Promise<DeploymentResult | undefined>;
  txMonitor: TxMonitor;
  isDeploying: boolean;
}

const Context = createContext<ITokenDeployerContext>({
  deployTokens: async () => undefined,
  txMonitor: { stage: "idle" },
  isDeploying: false,
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

  const [txMonitor, setTxMonitor] = useState<TxMonitor>({ stage: "idle" });
  const isDeploying =
    txMonitor.stage !== "idle" &&
    txMonitor.stage !== "success" &&
    txMonitor.stage !== "error";

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
    const shouldDeploySmartAccount = !userSmartAccountContractCode;
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
      ? concatHex([simpleAccountFactory, factoryCalldata])
      : "0x";
    console.log("initCode", initCode);

    return initCode;
  };

  const getTokenFactoryCalldata = async (params: ITokenParam[]) => {
    if (!batchMintTokenFactory) {
      return;
    }

    //  Encode calldata for deploying tokens
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

  const getSmartAccountEntryPointNonce = async () => {
    if (!publicClient || !entryPoint || !smartAccountAddress) {
      return;
    }

    const nonce = await publicClient.readContract({
      address: entryPoint,
      abi: entryPointABI,
      functionName: "getNonce",
      args: [smartAccountAddress, BigInt(0)],
    });
    console.log("nonce", nonce);

    return nonce;
  };

  const getUserOpHash = async (userOp: any) => {
    if (!publicClient || !userOp || !entryPoint) {
      return;
    }

    const userOpHash = await publicClient.readContract({
      address: entryPoint,
      abi: entryPointABI,
      functionName: "getUserOpHash",
      args: [userOp],
    });
    console.log("userOpHash", userOpHash);

    return userOpHash;
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

  const updateTxMonitor = (stage: TxStage) => {
    setTxMonitor({ ...txMonitor, stage });
  };

  const deployTokens = async () => {
    try {
      updateTxMonitor("building");

      if (
        !publicClient ||
        !walletClient ||
        !entryPoint ||
        !smartAccountAddress ||
        !batchMintTokenFactory ||
        !userEOA ||
        !simpleAccountFactory
      ) {
        return;
      }

      // Get initCode
      const initCode = await getSmartAccountInitCode();
      if (!initCode) {
        throw Error("initCode not available");
      }

      const isNewSmartAccount = initCode !== "0x";

      // Get callData
      const params: ITokenParam[] = tokenPreview.map(
        ({ name, symbol, totalSupply }) => ({
          name,
          symbol,
          totalSupply: BigInt(totalSupply),
        })
      );
      console.log("params", params);
      const callData = await getTokenFactoryCalldata(params);
      if (!callData) {
        throw Error("callData not available");
      }

      // Get nonce
      const nonce = await getSmartAccountEntryPointNonce();
      if (nonce === undefined) {
        throw Error("nonce not available");
      }

      // Ges gas and their limits
      const gasHandler = new GasHandler();
      const feeData = await publicClient.estimateFeesPerGas();
      console.log("feeData", feeData);

      const gasAndLimits = await gasHandler.buildGasAndLimits(
        feeData,
        tokenPreview.length,
        isNewSmartAccount
      );
      const {
        verificationGasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
        preVerificationGas,
      } = gasAndLimits;
      console.log("gasAndLimits", gasAndLimits);

      const estCallGasLimit = await gasHandler.estimateTokenDeploymentGas(
        publicClient,
        batchMintTokenFactory,
        tokenPreview.map(({ name, symbol, totalSupply }) => ({
          name,
          symbol,
          totalSupply: BigInt(totalSupply),
        })),
        userEOA
      );
      console.log("estCallGasLimit", estCallGasLimit);

      // Pack gas limits: verificationGasLimit (16 bytes) + callGasLimit (16 bytes)
      const accountGasLimits = encodePacked(
        ["uint128", "uint128"],
        [verificationGasLimit, estCallGasLimit] // [verificationGasLimit, callGasLimit]
      );
      console.log("accountGasLimits", accountGasLimits);

      // Pack gas fees: maxPriorityFeePerGas (16 bytes) + maxFeePerGas (16 bytes)
      const gasFees = encodePacked(
        ["uint128", "uint128"],
        [maxPriorityFeePerGas, maxFeePerGas]
      );
      console.log("gasFees", gasFees);

      // Construct UserOperation
      const userOp = {
        sender: smartAccountAddress,
        nonce,
        initCode,
        callData,
        accountGasLimits,
        preVerificationGas,
        gasFees,
        paymasterAndData: "0x" as Hex,
        signature: "0x",
      };
      console.log("userOp", userOp);

      // Get userOp hash
      const userOpHash = await getUserOpHash(userOp);
      if (!userOpHash) {
        throw Error("UserOperation hash not available");
      }

      // Sign userOp hash
      updateTxMonitor("signing");
      const userOpHashSignature = await signUserOpHash(userOp);
      if (!userOpHashSignature) {
        throw Error("UserOperation signature not available");
      }

      const signedOp = { ...userOp, signature: userOpHashSignature };
      console.log("signedOp", signedOp);

      const smartAccountDepositRequired =
        await gasHandler.getRequiredDepositForUserOp(
          publicClient,
          entryPoint,
          smartAccountAddress,
          verificationGasLimit,
          preVerificationGas,
          estCallGasLimit,
          maxFeePerGas
        );
      console.log("smartAccountDepositRequired", smartAccountDepositRequired);

      if (
        smartAccountDepositRequired !== undefined &&
        smartAccountDepositRequired > BigInt(0)
      ) {
        updateTxMonitor("simulating-prefund");
        const sim = await publicClient.simulateContract({
          account: userEOA,
          abi: entryPointABI,
          address: entryPoint,
          functionName: "depositTo",
          args: [smartAccountAddress],
          value: smartAccountDepositRequired,
        });

        updateTxMonitor("submitting-prefund");
        const hash = await walletClient.writeContract(sim.request);

        updateTxMonitor("mining-prefund");
        await publicClient.waitForTransactionReceipt({ hash });
      }

      updateTxMonitor("simulating-handleOps");
      const sim = await publicClient.simulateContract({
        abi: entryPointABI,
        address: entryPoint,
        functionName: "handleOps",
        args: [[signedOp], userEOA],
      });

      // Submit userOp
      updateTxMonitor("submitting-handleOps");
      const hash = await walletClient.writeContract(sim.request);

      updateTxMonitor("mining-handleOps");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("receipt", receipt);

      // Parse receipt logs
      const events = parseEventLogs({
        abi: [...batchMintTokenFactoryABI, ...entryPointABI],
        logs: receipt.logs,
        strict: false,
      });
      console.log("events", events);

      const deployedTokens = events
        .filter((evt) => evt.eventName === "TokenDeployed")
        .map((dEvt, idx) => ({
          name: dEvt.args.name,
          symbol: dEvt.args.symbol,
          tokenAddress: dEvt.args.token,
          type: "deployed",
          id: `Deployed${idx}`,
        }));
      const skippedTokens = events
        .filter((evt) => evt.eventName === "TokenSkipped")
        .map((sEvt, idx) => ({
          name: sEvt.args.name,
          symbol: sEvt.args.symbol,
          reason: sEvt.args.reason,
          type: "skipped",
          id: `Skipped${idx}`,
        }));

      updateTxMonitor("success");

      return { status: "ok", deployedTokens, skippedTokens };
    } catch (error: any) {
      console.error("deployTokens error", error);

      updateTxMonitor("error");

      const errMessage =
        error.shortMessage || error.message || "Transaction failed";

      return {
        status: "error",
        error: errMessage,
        deployedTokens: [],
        skippedTokens: [],
      };
    }
  };

  return (
    <Context.Provider value={{ deployTokens, txMonitor, isDeploying }}>
      {props.children}
    </Context.Provider>
  );
}
