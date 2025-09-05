import { createConfig, http } from "wagmi";
import { anvil, sepolia } from "wagmi/chains";
import { metaMask } from "wagmi/connectors";

export const config = createConfig({
  chains: [anvil, sepolia],
  connectors: [metaMask({ dappMetadata: { name: "BatchMintToken Deployer" } })],
  transports: {
    [anvil.id]: http(),
    [sepolia.id]: http(),
  },
});
