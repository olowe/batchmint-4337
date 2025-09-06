"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { useConnectionStatus } from "./ConnectionStatusProvider";
import TokenDetailsLink from "./TokenDetailsLink";

export default function TokenDeploymentResult(props: {
  deploymentResults: any[];
  onClose: () => void;
}) {
  const { deploymentResults, onClose } = props;

  const { isConnectionLocal } = useConnectionStatus();

  return (
    <Card className="glass border-border/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Deployment Results ({deploymentResults.length})
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 max-h-64 overflow-y-auto">
        {deploymentResults.map((result) => (
          <div
            key={result.id}
            className="glass rounded-lg p-3 border border-border/30"
          >
            <div className="flex items-start space-x-3">
              <div className="text-lg">
                {result.type === "deployed" ? "✅" : "⚠️"}
              </div>
              <div className="flex-1 font-mono text-xs space-y-1">
                <div className="font-semibold">
                  {result.type === "deployed" ? "Deployed:" : "Skipped:"}
                </div>

                <div>Name: {result.name}</div>
                <div>Symbol: {result.symbol}</div>

                {result.type === "deployed" && (
                  <div>
                    Token:{" "}
                    {isConnectionLocal ? (
                      result.tokenAddress
                    ) : (
                      <TokenDetailsLink
                        token={{
                          tokenName: result.name,
                          tokenSymbol: result.symbol,
                          tokenAddress: result.tokenAddress,
                          dateLogged: new Date(),
                        }}
                      />
                    )}
                  </div>
                )}

                {result.type === "skipped" && (
                  <div>Reason: {result.reason}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
