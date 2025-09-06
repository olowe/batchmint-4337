"use client";
import { config } from "@/wallet/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import ConnectionStatusProvider from "./ConnectionStatusProvider";
import TokenDeploymentForm from "./TokenDeploymentForm";
import TokenDeploymentHistory from "./TokenDeploymentHistory";
import TokenDeploymentPreview from "./TokenDeploymentPreview";
import TokenDeploymentProvider from "./TokenDeploymentProvider";
import TokenFormProvider from "./TokenFormProvider";
import WalletButton from "./WalletButton";

const queryClient = new QueryClient();

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header className="sticky top-0 z-50 glass-strong border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-balance">
              BatchMintToken Deployer
            </h1>

            <WalletButton />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <TokenDeploymentForm />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <TokenDeploymentPreview />
            <TokenDeploymentHistory />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectionStatusProvider>
          <TokenFormProvider>
            <TokenDeploymentProvider>
              <Home />
            </TokenDeploymentProvider>
          </TokenFormProvider>
        </ConnectionStatusProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
