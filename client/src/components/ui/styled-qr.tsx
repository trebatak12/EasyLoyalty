
import { useEffect, useRef } from "react";
import QRCodeStyling from "@liquid-js/qr-code-styling";

interface StyledQRProps {
  data: string;
  size?: number;
  className?: string;
}

export default function StyledQR({ data, size = 200, className = "" }: StyledQRProps) {
  const ref = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    if (!qrRef.current) {
      qrRef.current = new QRCodeStyling({
        width: size,
        height: size,
        data: data,
        dotsOptions: {
          type: "dots",
          color: "#7C2D12"  // hnědá barva
        },
        backgroundOptions: {
          color: "#FEF3C7"  // krémové pozadí
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

    // Aktualizovat data když se změní
    qrRef.current.update({ data });

    // Připojit k DOM
    if (ref.current) {
      // Vyčistit předchozí obsah
      ref.current.innerHTML = '';
      qrRef.current.append(ref.current);
    }

    return () => {
      // Vyčištění při unmount
      if (qrRef.current && qrRef.current._canvas) {
        qrRef.current._canvas.remove();
      }
    };
  }, [data, size]);

  return <div className={className} ref={ref} />;
}
