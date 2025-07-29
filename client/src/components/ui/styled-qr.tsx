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
          borderRadius: "24px",
          background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 50%, #FED7AA 100%)",
          padding: "16px",
          boxShadow: "0 20px 40px rgba(124, 45, 18, 0.1), 0 8px 16px rgba(124, 45, 18, 0.08)"
        }}
      >
        <div 
          style={{
            borderRadius: "20px",
            background: "white",
            padding: "16px",
            position: "relative",
            width: size,
            height: size,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.06)"
          }}
        >
          <div 
            style={{ 
              filter: "drop-shadow(0 2px 8px rgba(124, 45, 18, 0.15))",
              borderRadius: "12px",
              overflow: "hidden"
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
                borderRadius: "12px",
                display: "block"
              }}
            />
          </div>

          {/* Subtle inner glow */}
          <div 
            className="absolute inset-0 rounded-[20px] pointer-events-none"
            style={{
              background: "radial-gradient(circle at center, rgba(251, 191, 36, 0.03) 0%, transparent 70%)"
            }}
          />
        </div>
      </div>
    </div>
  );
}