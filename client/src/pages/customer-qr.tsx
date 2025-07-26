import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { QRPanel } from "@/components/ui/qr-panel";

export default function CustomerQR() {
  const [, setLocation] = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: qrData, isLoading, refetch } = useQuery({
    queryKey: ["/api/me/qr", refreshKey],
    queryFn: () => api.post("/api/me/qr", {}),
    refetchInterval: false,
    staleTime: 0
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const handleClose = () => {
    setLocation("/home");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/home")}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Payment QR Code</h1>
        </div>

        {isLoading ? (
          <div className="card-easyloyalty">
            <div className="p-8 text-center">
              <div className="w-64 h-64 bg-muted rounded-2xl mx-auto mb-6 animate-pulse" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse mx-auto mb-4" />
              <div className="h-6 w-24 bg-muted rounded animate-pulse mx-auto" />
            </div>
          </div>
        ) : qrData ? (
          <QRPanel
            qrPayload={qrData.qrPayload}
            shortCode={qrData.shortCode}
            expiresAt={qrData.expiresAt}
            onRefresh={handleRefresh}
            onClose={handleClose}
          />
        ) : (
          <div className="card-easyloyalty">
            <div className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                Failed to generate QR code
              </p>
              <Button onClick={handleRefresh} className="btn-primary">
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
