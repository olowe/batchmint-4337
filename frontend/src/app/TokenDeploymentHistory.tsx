"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import useDeployedTokens from "@/hooks/useDeployedTokens";
import useSmartAccount from "@/hooks/useSmartAccount";
import { useState } from "react";
import { Hex } from "viem";
import { useConnectionStatus } from "./ConnectionStatusProvider";
import TokenDetailsLink from "./TokenDetailsLink";

export default function TokenDeploymentHistory() {
  const smartAccountAddress = useSmartAccount();
  const { isConnectionLocal } = useConnectionStatus();
  const deployedTokens = useDeployedTokens(smartAccountAddress as Hex);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalDeployedCount = deployedTokens.length;

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-lg">Deployment Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center p-4 glass rounded-lg">
          <div className="text-sm text-muted-foreground mb-2">
            You have deployed a total of
          </div>
          <Dialog
            open={isModalOpen}
            onOpenChange={(open) => {
              if (totalDeployedCount > 0) {
                setIsModalOpen(open);
              } else {
                setIsModalOpen(false);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="link"
                className="text-2xl font-bold text-primary p-0 h-auto"
              >
                {totalDeployedCount} token{totalDeployedCount !== 1 ? "s" : ""}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>
                  All Deployed Tokens ({totalDeployedCount})
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {deployedTokens
                  .sort(
                    (a, b) => b.dateLogged.getTime() - a.dateLogged.getTime()
                  )
                  .map((token) => (
                    <div
                      key={`${token.tokenName},${token.tokenSymbol}`}
                      className="glass rounded-lg p-4 border border-border/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{token.tokenName}</div>
                          <div className="text-sm text-muted-foreground flex">
                            ${token.tokenSymbol} •{" "}
                            {isConnectionLocal ? (
                              <div className="text-xs text-muted-foreground mt-1">
                                {token.tokenAddress}
                              </div>
                            ) : (
                              <TokenDetailsLink token={token} />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Deployed on {token.dateLogged.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
