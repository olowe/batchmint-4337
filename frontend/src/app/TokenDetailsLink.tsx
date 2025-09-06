import { Button } from "@/components/ui/button";
import { DeployedToken } from "@/hooks/useDeployedTokens";
import networkContractsConfig from "@/wallet/network-contracts.config";
import { ExternalLink } from "lucide-react";
import { Hex } from "viem";
import { useAccount } from "wagmi";

export default function TokenDetailsLink(props: { token: DeployedToken }) {
  const { chainId } = useAccount();

  const { token } = props;

  const openTokenDetails = (tokenAddress: Hex) => {
    window.open(
      `${
        networkContractsConfig[chainId as number].chainExlorerUrl
      }/token/${tokenAddress}`,
      "_blank"
    );
  };
  return (
    <Button
      variant="link"
      size="sm"
      onClick={() => openTokenDetails(token.tokenAddress)}
      className="text-xs text-primary hover:text-primary p-0 h-auto inline-flex items-center space-x-1"
    >
      <span className="font-mono">
        {token.tokenAddress.slice(0, 10)}...
        {token.tokenAddress.slice(-8)}
      </span>
      <ExternalLink className="w-3 h-3" />
    </Button>
  );
}
