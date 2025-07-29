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
        className="relative overflow-hidden"
        style={{
          borderRadius: "20px",
          background: "linear-gradient(135deg, #FEF3C7 0%, #FED7AA 100%)",
          padding: "12px",
          boxShadow: "0 8px 24px rgba(124, 45, 18, 0.15)"
        }}
      >
        <div 
          style={{
            borderRadius: "16px",
            background: "white",
            padding: "16px",
            position: "relative",
            width: size,
            height: size,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <QRCodeSVG
            value={value}
            size={size - 32}
            bgColor="white"
            fgColor="#7C2D12"
            level="M"
            includeMargin={false}
            style={{
              filter: "drop-shadow(0 2px 4px rgba(124, 45, 18, 0.1))"
            }}
          />

          {/* Decorative corner dots */}
          <div 
            className="absolute top-3 left-3 w-2 h-2 rounded-full"
            style={{ background: "#D97706" }}
          />
          <div 
            className="absolute top-3 right-3 w-2 h-2 rounded-full"
            style={{ background: "#D97706" }}
          />
          <div 
            className="absolute bottom-3 left-3 w-2 h-2 rounded-full"
            style={{ background: "#D97706" }}
          />
          <div 
            className="absolute bottom-3 right-3 w-2 h-2 rounded-full"
            style={{ background: "#D97706" }}
          />
        </div>
      </div>
    </div>
  );
}