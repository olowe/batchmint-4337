import simpleAccountFactoryABI from "@/abis/SimpleAccountFactory";
import { useConnectionStatus } from "@/app/ConnectionStatusProvider";
import networkContractsConfig from "@/wallet/network-contracts.config";
import { useAccount, useReadContract } from "wagmi";

const useSmartAccount = () => {
  const { address: userEOA, chainId } = useAccount();
  const { isConnectionSupported } = useConnectionStatus();

  const simpleAccountFactory = isConnectionSupported
    ? networkContractsConfig[chainId as number].simpleAccountFactory
    : undefined;

  const { data: smartAccountAddress } = useReadContract({
    abi: simpleAccountFactoryABI,
    address: simpleAccountFactory,
    functionName: "getAddress",
    args: [userEOA as `0x${string}`, BigInt(0)],
    query: { enabled: isConnectionSupported },
  });

  return smartAccountAddress;
};

export default useSmartAccount;
