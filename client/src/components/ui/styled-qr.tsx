
import { QRCodeSVG } from "qrcode.react";

interface StyledQRProps {
  value: string;
  size?: number;
  className?: string;
}

export function StyledQR({ value, size = 200, className = "" }: StyledQRProps) {
  return (
    <div className={`inline-block ${className}`}>
      <div 
        style={{
          backgroundColor: "white",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb"
        }}
      >
        <QRCodeSVG
          value={value}
          size={size}
          bgColor="white"
          fgColor="black"
          level="M"
          includeMargin={false}
        />
      </div>
    </div>
  );
}
