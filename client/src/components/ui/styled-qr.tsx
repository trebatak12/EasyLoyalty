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
          borderRadius: "20px",
          background: "white",
          padding: "20px",
          position: "relative",
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 20px 40px rgba(124, 45, 18, 0.12), 0 8px 16px rgba(124, 45, 18, 0.08)"
        }}
      >
        <QRCodeSVG
          value={value}
          size={size - 40}
          bgColor="white"
          fgColor="#7C2D12"
          level="M"
          includeMargin={false}
          style={{
            borderRadius: "8px",
            display: "block"
          }}
        />
      </div>
    </div>
  );
}