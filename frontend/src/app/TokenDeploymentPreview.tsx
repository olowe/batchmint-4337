"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { useTokenFormProvider } from "./TokenFormProvider";

export default function TokenDeploymentPreview() {
  const { tokenPreview, removeTokenFromPreview, formatNumber } =
    useTokenFormProvider();

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-lg">
          Token Preview ({tokenPreview.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {tokenPreview.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-sm">No tokens added yet</div>
            </div>
          ) : (
            tokenPreview.map((token) => (
              <div
                key={token.id}
                className="glass rounded-lg p-3 border border-border/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{token.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ${token.symbol} • {formatNumber(token.totalSupply)} tokens
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTokenFromPreview(token.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
