import { useEffect, useRef } from "react";

interface StyledQRProps {
  value: string;
  size?: number;
  className?: string;
}

export function StyledQR({ value, size = 200, className = "" }: StyledQRProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const generateQR = async () => {
      try {
        // Dynamic import for client-side only
        const QRCodeStyling = (await import("@liquid-js/qr-code-styling")) as any;
        
        if (!qrRef.current) return;

        const qrCode = new (QRCodeStyling.default || QRCodeStyling)({
          width: size,
          height: size,
          data: value,
          image: undefined,
          dotsOptions: {
            color: "#000000",
            type: "dots", // Use circular dots like in the image
          },
          cornersSquareOptions: {
            color: "#000000",
            type: "extra-rounded",
          },
          cornersDotOptions: {
            color: "#000000",
            type: "dot",
          },
          backgroundOptions: {
            color: "#ffffff",
          },
          imageOptions: {
            crossOrigin: "anonymous",
            margin: 0
          },
          qrOptions: {
            errorCorrectionLevel: "M"
          }
        });

        // Clear previous QR code
        qrRef.current.innerHTML = "";
        
        // Append new QR code
        qrCode.append(qrRef.current);
      } catch (error) {
        console.error("Chyba při vytváření QR kódu:", error);
        
        // Fallback to simple SVG QR if styled version fails
        if (qrRef.current) {
          qrRef.current.innerHTML = `
            <div style="
              width: ${size}px; 
              height: ${size}px; 
              background: #f0f0f0; 
              display: flex; 
              align-items: center; 
              justify-content: center;
              border-radius: 8px;
              color: #666;
              font-size: 14px;
              text-align: center;
            ">
              QR kód
            </div>
          `;
        }
      }
    };

    generateQR();
  }, [value, size]);

  return (
    <div 
      ref={qrRef} 
      className={`inline-block ${className}`}
      style={{ minWidth: size, minHeight: size }}
    />
  );
}