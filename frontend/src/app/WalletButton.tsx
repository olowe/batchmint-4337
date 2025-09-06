"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import {
  useAccount,
  useBalance,
  useConnect,
  useConnectors,
  useDisconnect,
} from "wagmi";
import { useConnectionStatus } from "./ConnectionStatusProvider";

export default function WalletButton() {
  const connectors = useConnectors();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { address: walletAddress, isConnected, chainId } = useAccount();
  const { isConnectionSupported } = useConnectionStatus();
  const { data: walletBalance } = useBalance({
    address: walletAddress,
    chainId,
  });

  const formattedWalletBalance = walletBalance
    ? Number(formatUnits(walletBalance.value, walletBalance.decimals)).toFixed(
        2
      )
    : undefined;

  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Don’t render anything (or render a skeleton) until after mount,
  // so server and client HTML match.
  if (!mounted) return null;

  return (
    <div>
      {!isConnected && (
        <Button
          variant="outline"
          onClick={() => {
            connect({ connector: connectors[0] });
          }}
          className="glass font-mono bg-black text-white hover:bg-black"
        >
          Connect to MetaMask
        </Button>
      )}

      {isConnected && walletAddress && (
        <div className="flex items-center space-x-3">
          <Badge
            variant={isConnectionSupported ? "outline" : "destructive"}
            className={`glass ${
              isConnectionSupported ? "bg-success text-white" : ""
            }`}
          >
            <Wallet className="w-3 h-3 mr-1" />
            {isConnectionSupported ? "Connected" : "Unsupported network"}
          </Badge>

          <div className="glass font-mono text-sm bg-transparent border border-border/50 rounded-md px-3 py-1.5 flex">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            {walletBalance && <>&nbsp;|&nbsp;</>}
            {walletBalance && (
              <div className="text-primary/90">
                {formattedWalletBalance} {walletBalance.symbol}
              </div>
            )}
          </div>

          <Button
            variant="link"
            size="sm"
            onClick={() => disconnect()}
            className="text-muted-foreground hover:text-destructive p-0 h-auto"
            title="Disconnect Wallet"
          >
            Disconnect Wallet
          </Button>
        </div>
      )}
    </div>
  );
}
