import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { CountdownTimer } from "./countdown-timer";

interface QRPanelProps {
  qrPayload: string;
  shortCode: string;
  expiresAt: string;
  onRefresh: () => void;
  onClose: () => void;
}

export function QRPanel({ qrPayload, shortCode, expiresAt, onRefresh, onClose }: QRPanelProps) {
  const expiryTime = new Date(expiresAt).getTime();

  return (
    <Card className="qr-panel">
      <CardContent className="pt-6">
        <h3 className="text-xl font-semibold text-foreground mb-6">Payment QR Code</h3>
        
        {/* QR Code */}
        <div className="w-64 h-64 bg-white border-2 border-border rounded-2xl mx-auto mb-6 flex items-center justify-center">
          <QRCodeSVG 
            value={qrPayload}
            size={240}
            bgColor="#ffffff"
            fgColor="#000000"
            level="M"
            includeMargin={true}
          />
        </div>

        {/* Manual Code */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">Manual Code (if QR doesn't work)</p>
          <Badge variant="secondary" className="text-lg font-mono font-bold px-4 py-2">
            {shortCode}
          </Badge>
        </div>

        {/* Countdown */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">Expires in</p>
          <CountdownTimer 
            targetTime={expiryTime}
            className="text-lg font-semibold text-foreground"
            onExpire={() => {
              // Auto-refresh on expiry
              onRefresh();
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex space-x-4">
          <Button 
            variant="secondary" 
            onClick={onRefresh}
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={onClose}
            className="flex-1 btn-primary"
          >
            Done
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
