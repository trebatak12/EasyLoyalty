
import { QRCodeSVG } from "qrcode.react";

interface StyledQRProps {
  value: string;
  size?: number;
  className?: string;
}

export function StyledQR({ value, size = 200, className = "" }: StyledQRProps) {
  // Responzivní velikost - menší na mobilních zařízeních
  const getResponsiveSize = () => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      return isMobile ? Math.min(size, 180) : size;
    }
    return size;
  };

  const responsiveSize = getResponsiveSize();

  return (
    <div className={`inline-block ${className}`}>
      <div 
        className="w-full max-w-full overflow-hidden"
        style={{
          backgroundColor: "white",
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <QRCodeSVG
          value={value}
          size={responsiveSize}
          bgColor="white"
          fgColor="black"
          level="M"
          includeMargin={false}
          style={{
            maxWidth: "100%",
            height: "auto"
          }}
        />
      </div>
    </div>
  );
}
