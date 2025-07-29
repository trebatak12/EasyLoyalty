import { QRCodeSVG } from "qrcode.react";

interface StyledQRProps {
  value: string;
  size?: number;
  className?: string;
}

export function StyledQR({ value, size = 200, className = "" }: StyledQRProps) {
  return (
    <div className={`inline-block ${className}`}>
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        includeMargin={false}
        style={{
          borderRadius: "12px",
          border: "4px solid #ffffff",
          backgroundColor: "#ffffff"
        }}
      />
    </div>
  );
}