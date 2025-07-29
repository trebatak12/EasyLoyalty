import { useEffect, useState } from "react";

interface StyledQRProps {
  value: string;
  size?: number;
  className?: string;
}

// Generate real QR matrix using qrcode library
async function generateQRMatrix(text: string): Promise<{ matrix: boolean[][], size: number }> {
  try {
    // Dynamic import for qrcode
    const QRCode = await import('qrcode');
    
    // Generate QR code segments
    const segments = QRCode.default.create(text, { errorCorrectionLevel: 'M' });
    const matrix: boolean[][] = [];
    const size = segments.modules.size;
    
    // Convert modules to 2D boolean array
    for (let row = 0; row < size; row++) {
      matrix[row] = [];
      for (let col = 0; col < size; col++) {
        matrix[row][col] = segments.modules.get(row * size + col) ? true : false;
      }
    }
    
    return { matrix, size };
  } catch (error) {
    console.error('Chyba při generování QR matice:', error);
    
    // Fallback simple pattern
    const size = 25;
    const matrix: boolean[][] = [];
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) & 0xffffffff;
    }
    
    for (let row = 0; row < size; row++) {
      matrix[row] = [];
      for (let col = 0; col < size; col++) {
        const cellHash = ((hash + row * size + col) * 16807) % 2147483647;
        matrix[row][col] = cellHash % 3 === 0;
      }
    }
    
    return { matrix, size };
  }
}

export function StyledQR({ value, size = 200, className = "" }: StyledQRProps) {
  const [qrData, setQrData] = useState<{ matrix: boolean[][], size: number }>({ matrix: [], size: 25 });
  
  useEffect(() => {
    generateQRMatrix(value).then((data) => {
      console.log('QR data generated:', data.size, 'modules');
      setQrData(data);
    });
  }, [value]);
  
  const moduleSize = (size - 40) / qrData.size; // Account for padding
  
  return (
    <div className={`inline-block ${className}`}>
      <div 
        className="relative overflow-hidden"
        style={{
          borderRadius: "20px",
          background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
          padding: "8px",
          boxShadow: "0 12px 40px rgba(30, 41, 59, 0.4)"
        }}
      >
        <div 
          style={{
            borderRadius: "16px",
            background: "white",
            padding: "12px",
            position: "relative",
            width: size - 16,
            height: size - 16
          }}
        >
          <svg 
            width={size - 40} 
            height={size - 40} 
            viewBox={`0 0 ${size - 40} ${size - 40}`}
            style={{ display: "block" }}
          >
            {/* Gradient definition must be first */}
            <defs>
              <linearGradient id="qrGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="50%" stopColor="#334155" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>
            </defs>
            
            {qrData.matrix.length > 0 && qrData.matrix.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                if (!cell) return null;
                
                const x = colIndex * moduleSize;
                const y = rowIndex * moduleSize;
                
                // Check if it's a finder pattern (corner)
                const isFinderPattern = 
                  (rowIndex < 7 && colIndex < 7) || 
                  (rowIndex < 7 && colIndex >= qrData.size - 7) || 
                  (rowIndex >= qrData.size - 7 && colIndex < 7);
                
                if (isFinderPattern) {
                  // Rounded rectangles for finder patterns
                  return (
                    <rect
                      key={`${rowIndex}-${colIndex}`}
                      x={x + moduleSize * 0.1}
                      y={y + moduleSize * 0.1}
                      width={moduleSize * 0.8}
                      height={moduleSize * 0.8}
                      rx={moduleSize * 0.3}
                      ry={moduleSize * 0.3}
                      fill="#1e293b"
                    />
                  );
                } else {
                  // Circles for data modules - toto je změna tvarů!
                  return (
                    <circle
                      key={`${rowIndex}-${colIndex}`}
                      cx={x + moduleSize * 0.5}
                      cy={y + moduleSize * 0.5}
                      r={moduleSize * 0.4}
                      fill="#1e293b"
                    />
                  );
                }
              })
            )}
          </svg>
          
          {/* Decorative corner elements */}
          <div 
            className="absolute top-2 left-2 w-2 h-2 rounded-full"
            style={{ background: "linear-gradient(135deg, #1e293b, #334155)" }}
          />
          <div 
            className="absolute top-2 right-2 w-2 h-2 rounded-full"
            style={{ background: "linear-gradient(135deg, #1e293b, #334155)" }}
          />
          <div 
            className="absolute bottom-2 left-2 w-2 h-2 rounded-full"
            style={{ background: "linear-gradient(135deg, #1e293b, #334155)" }}
          />
          <div 
            className="absolute bottom-2 right-2 w-2 h-2 rounded-full"
            style={{ background: "linear-gradient(135deg, #1e293b, #334155)" }}
          />
        </div>
      </div>
    </div>
  );
}