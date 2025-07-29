import { QRCodeSVG } from "qrcode.react";

interface StyledQRProps {
  data: string;
  size?: number;
  className?: string;
}

export default function StyledQR({ data, size = 200, className = "" }: StyledQRProps) {
  return (
    <div className={`${className} relative`}>
      <div 
        className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border-2 border-orange-200 shadow-lg"
        style={{ 
          width: size + 20, 
          height: size + 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div className="qr-modern-style">
          <QRCodeSVG
            value={data}
            size={size}
            bgColor="transparent"
            fgColor="#7C2D12"
            level="M"
            includeMargin={false}
            imageSettings={{
              src: "",
              x: undefined,
              y: undefined,
              height: 0,
              width: 0,
              excavate: false,
            }}
          />
        </div>
      </div>
    </div>
  );
}