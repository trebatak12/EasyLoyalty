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
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "8px",
          boxShadow: "0 12px 40px rgba(102, 126, 234, 0.3)"
        }}
      >
        <div 
          style={{
            borderRadius: "16px",
            background: "white",
            padding: "12px",
            position: "relative"
          }}
        >
          <QRCodeSVG
            value={value}
            size={size - 40} // Account for padding
            level="M"
            includeMargin={false}
            style={{
              filter: "contrast(1.1) brightness(0.95)",
              borderRadius: "8px"
            }}
          />
          
          {/* Decorative corner dots */}
          <div 
            className="absolute top-2 left-2 w-3 h-3 rounded-full"
            style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
          />
          <div 
            className="absolute top-2 right-2 w-3 h-3 rounded-full"
            style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
          />
          <div 
            className="absolute bottom-2 left-2 w-3 h-3 rounded-full"
            style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
          />
          <div 
            className="absolute bottom-2 right-2 w-3 h-3 rounded-full"
            style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
          />
        </div>
        
        {/* Glowing effect */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            borderRadius: "20px",
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            filter: "blur(8px)"
          }}
        />
      </div>
    </div>
  );
}