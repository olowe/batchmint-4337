"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

export default function TokenDeploymentError(props: {
  deploymentError: string;
  onClose: () => void;
}) {
  const { deploymentError, onClose } = props;

  return (
    <Card className="glass border-destructive/50 bg-destructive/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-destructive">
            Deployment Error
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
        <div className="glass rounded-lg p-3 border border-destructive/30">
          <div className="flex items-start space-x-3">
            <div className="text-lg">❌</div>
            <div className="flex-1">
              <div className="font-medium text-destructive mb-1">
                Deployment Failed
              </div>
              <div className="text-sm text-destructive/80">
                {deploymentError}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
