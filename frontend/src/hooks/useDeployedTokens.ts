import batchMintTokenFactoryABI from "@/abis/BatchMintTokenFactory";
import { useConnectionStatus } from "@/app/ConnectionStatusProvider";
import networkContractsConfig from "@/wallet/network-contracts.config";
import { useEffect, useState } from "react";
import { Hex, parseAbiItem } from "viem";
import { useAccount, usePublicClient, useWatchContractEvent } from "wagmi";

export interface DeployedToken {
  tokenName: string;
  tokenSymbol: string;
  tokenAddress: Hex;
  dateLogged: Date;
}

const useDeployedTokens = (smartAccountAddress: Hex) => {
  const { isConnected, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { isConnectionSupported, isConnectionLocal } = useConnectionStatus();

  const batchMintTokenFactory = isConnectionSupported
    ? networkContractsConfig[chainId as number].batchMintTokenFactory
    : undefined;

  const [deployedTokens, setDeployedTokens] = useState<DeployedToken[]>([]);

  useEffect(() => {
    if (
      !publicClient ||
      !isConnected ||
      !isConnectionSupported ||
      !smartAccountAddress ||
      !batchMintTokenFactory
    ) {
      setDeployedTokens([]);
      return;
    }

    const getEventLogs = async () => {
      const eventLogs = await publicClient.getLogs({
        address: batchMintTokenFactory,
        event: parseAbiItem(
          "event TokenDeployed(address indexed creator,address indexed token,string name,string symbol)"
        ),
        args: { creator: smartAccountAddress } as any,
        fromBlock: isConnectionLocal
          ? BigInt(0)
          : BigInt(
              process.env
                .NEXT_PUBLIC_TESTNET_BATCH_MINT_TOKEN_FACTORY_DEPLOY_BLOCK as string
            ),
        toBlock: "latest",
      });

      const deployed = await Promise.all(
        eventLogs.map(async (eLog) => {
          const block = await publicClient.getBlock({
            blockNumber: eLog.blockNumber,
          });

          return {
            tokenName: eLog.args.name as string,
            tokenSymbol: eLog.args.symbol as string,
            tokenAddress: eLog.args.token as Hex,
            dateLogged: new Date(Number(block.timestamp) * 1000),
          };
        })
      );

      setDeployedTokens(deployed);
    };

    getEventLogs();
  }, [isConnected, isConnectionSupported, smartAccountAddress]);

  useWatchContractEvent({
    address: batchMintTokenFactory,
    abi: batchMintTokenFactoryABI,
    eventName: "TokenDeployed",
    onLogs(logs) {
      const newlyDeployed = logs.filter(
        (l) =>
          l.args.creator?.toLowerCase() === smartAccountAddress.toLowerCase()
      );

      if (newlyDeployed.length) {
        // Use IIFE because onLogs is not async
        (async () => {
          if (!publicClient) {
            return;
          }

          const newlyDeployedTokens = await Promise.all(
            newlyDeployed.map(async (eLog) => {
              const block = await publicClient.getBlock({
                blockNumber: eLog.blockNumber,
              });

              return {
                tokenName: eLog.args.name as string,
                tokenSymbol: eLog.args.symbol as string,
                tokenAddress: eLog.args.token as Hex,
                dateLogged: new Date(Number(block.timestamp) * 1000),
              };
            })
          );

          setDeployedTokens([...newlyDeployedTokens, ...deployedTokens]);
        })().catch(() => {});
      }
    },
    enabled:
      isConnected &&
      isConnectionSupported &&
      !!smartAccountAddress &&
      !!batchMintTokenFactory,
  });

  return deployedTokens;
};

export default useDeployedTokens;
