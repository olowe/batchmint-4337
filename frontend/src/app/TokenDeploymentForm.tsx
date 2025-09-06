"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import TokenDeploymentError from "./TokenDeploymentError";
import { TxStage, useTokenDeployer } from "./TokenDeploymentProvider";
import TokenDeploymentResult from "./TokenDeploymentResult";
import { useTokenFormProvider } from "./TokenFormProvider";

const getTxStatusMessage = (stage: TxStage): string => {
  switch (stage) {
    case "building":
      return "Preparing operation...";
    case "signing":
      return "Waiting for signature...";
    case "simulating":
      return "Simulating transaction...";
    case "submitting":
      return "Submitting to network...";
    case "mining":
      return "Mining transaction...";
    case "success":
      return "Transaction successful!";
    case "error":
      return "Transaction failed";
    default:
      return "";
  }
};

export default function TokenDeploymentForm() {
  const {
    formData,
    tokenPreview,
    isFormValid,
    updateFormData,
    addToken,
    clearForm,
    isDuplicateToken,
    isDeploymentEnabled,
    notification,
  } = useTokenFormProvider();

  const { deployTokens, isDeploying, txMonitor } = useTokenDeployer();

  const [deploymentResults, setDeploymentResults] = useState<any[]>([]);
  const [deploymentError, setDeploymentError] = useState<string | undefined>(
    undefined
  );

  const handleDeployTokens = async () => {
    const deploymentResults = await deployTokens();

    if (!deploymentResults) {
      setDeploymentError("An error has occured");
      return;
    }

    if (deploymentResults.status === "error") {
      setDeploymentError(deploymentResults.error);
      return;
    }

    if (deploymentResults.status === "ok") {
      clearForm();
      setDeploymentError(undefined);

      setDeploymentResults([
        ...deploymentResults.deployedTokens,
        ...deploymentResults.skippedTokens,
      ]);
    }
  };

  return (
    <>
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-balance">Deploy Tokens</CardTitle>
          <CardDescription className="text-pretty">
            Deploy multiple ERC-20 tokens in a single transaction.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="mb-4">
                <h4 className="font-medium">Add New Token</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Token Name</Label>
                  <Input
                    id="name"
                    placeholder="My Token"
                    value={formData.name}
                    onChange={(e) => updateFormData("name", e.target.value)}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbol</Label>
                  <Input
                    id="symbol"
                    placeholder="MTK"
                    value={formData.symbol}
                    onChange={(e) =>
                      updateFormData("symbol", e.target.value.toUpperCase())
                    }
                    className="bg-white uppercase"
                    maxLength={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supply">Total Supply</Label>
                  <Input
                    id="supply"
                    type="number"
                    placeholder="1000000"
                    value={formData.totalSupply}
                    onChange={(e) =>
                      updateFormData("totalSupply", e.target.value)
                    }
                    className="bg-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            onClick={addToken}
            className="w-full glass border-dashed border-2 hover:bg-black/70 hover:border-black/70 bg-transparent"
            disabled={!isFormValid || tokenPreview.length >= 10}
          >
            {isDuplicateToken()
              ? "Token already exists"
              : `Add Token ${tokenPreview.length >= 10 ? "(Max 10)" : ""}`}
          </Button>
          {notification && (
            <div className="glass rounded-lg p-3 border border-amber-200/50 bg-amber-50/50 text-amber-800">
              <div className="text-sm font-medium">{notification}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={clearForm}
              className="glass bg-transparent"
              disabled={isDeploying}
            >
              Clear All
            </Button>
            <Button
              onClick={handleDeployTokens}
              disabled={
                tokenPreview.length === 0 || isDeploying || !isDeploymentEnabled
              }
              className={`flex-1 ${
                tokenPreview.length === 0 || isDeploying
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
            >
              {isDeploying
                ? "Deploying..."
                : `Deploy ${tokenPreview.length} Token${
                    tokenPreview.length !== 1 ? "s" : ""
                  }`}
            </Button>
          </div>

          {isDeploying && (
            <div className="glass rounded-lg p-3 border border-primary/30 bg-primary/5">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <div className="text-sm font-medium text-primary">
                  {getTxStatusMessage(txMonitor.stage)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {deploymentError && (
        <TokenDeploymentError
          deploymentError={deploymentError}
          onClose={() => setDeploymentError(undefined)}
        />
      )}

      {deploymentResults.length > 0 && (
        <TokenDeploymentResult
          deploymentResults={deploymentResults}
          onClose={() => setDeploymentResults([])}
        />
      )}
    </>
  );
}
