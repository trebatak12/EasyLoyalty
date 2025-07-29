
import { useEffect, useRef } from "react";

interface StyledQRProps {
  data: string;
  size?: number;
  className?: string;
}

export default function StyledQR({ data, size = 200, className = "" }: StyledQRProps) {
  const ref = useRef<HTMLDivElement>(null);
  const qrRef = useRef<any>(null);

  useEffect(() => {
    const initQR = async () => {
      try {
        // Dynamický import knihovny
        const QRCodeStyling = (await import("@liquid-js/qr-code-styling")).default;
        
        if (!qrRef.current) {
          qrRef.current = new QRCodeStyling({
            width: size,
            height: size,
            data: data,
            dotsOptions: {
              type: "dots",
              color: "#7C2D12"
            },
            backgroundOptions: {
              color: "#FEF3C7"
            },
            cornersSquareOptions: { 
              type: "dot", 
              color: "#7C2D12" 
            },
            cornersDotOptions: { 
              type: "dot", 
              color: "#7C2D12" 
            },
            qrOptions: { 
              errorCorrectionLevel: "M" 
            }
          });
        }

        // Aktualizovat data
        qrRef.current.update({ data });

        // Připojit k DOM
        if (ref.current) {
          ref.current.innerHTML = '';
          qrRef.current.append(ref.current);
        }
      } catch (error) {
        console.error("Chyba při vytváření QR kódu:", error);
        // Fallback - zobrazit alespoň text
        if (ref.current) {
          ref.current.innerHTML = `
            <div style="
              width: ${size}px; 
              height: ${size}px; 
              background: #FEF3C7; 
              border: 2px solid #7C2D12;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
              font-size: 12px;
              color: #7C2D12;
              text-align: center;
              padding: 10px;
              box-sizing: border-box;
            ">
              QR kód se nepodařilo vygenerovat
            </div>
          `;
        }
      }
    };

    initQR();

    return () => {
      // Cleanup
      if (ref.current) {
        ref.current.innerHTML = '';
      }
    };
  }, [data, size]);

  return <div className={className} ref={ref} />;
}
