import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, Copy, QrCode } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

export default function CustomerQR() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState(60);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: qrData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["/api/me/qr", refreshKey],
    queryFn: () => api.post("/api/me/qr", {}),
    refetchInterval: false,
    staleTime: 0,
    refetchOnWindowFocus: false
  });

  // Countdown timer
  useEffect(() => {
    if (!qrData) return;
    
    setTimeLeft(60); // Reset timer when new QR data arrives
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleRefresh(); // Auto-refresh when time expires
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [qrData]);

  const handleCopyCode = () => {
    if (qrData?.shortCode) {
      navigator.clipboard.writeText(qrData.shortCode);
      toast({
        title: "Zkopírováno!",
        description: "Platební kód byl zkopírován do schránky",
        variant: "default"
      });
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setTimeLeft(60);
    refetch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-white text-high-contrast">
      <div className="container mx-auto px-6 py-8 max-w-md">
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/home")}
            className="mr-4 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Platební QR kód</h1>
        </div>

        {isLoading ? (
          <Card className="bg-white border-2 border-gray-300 rounded-2xl shadow-strong">
            <CardContent className="p-8 text-center">
              <div className="animate-pulse">
                <div className="w-64 h-64 bg-gray-200 rounded-2xl mx-auto mb-6"></div>
                <div className="h-4 w-32 bg-gray-200 rounded mx-auto mb-4"></div>
                <div className="h-6 w-24 bg-gray-200 rounded mx-auto"></div>
              </div>
            </CardContent>
          </Card>
        ) : qrData ? (
          <div className="space-y-6">
            {/* QR Code Card */}
            <Card className="bg-white border-2 border-blue-300 rounded-2xl shadow-strong">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <div className="bg-white p-4 rounded-2xl border-4 border-blue-200 inline-block">
                    <QRCodeSVG
                      value={qrData.qrPayload}
                      size={200}
                      level="M"
                      includeMargin={false}
                      className="rounded-lg"
                    />
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Ukažte tento QR kód pokladníkovi
                  </h3>
                  <p className="text-base text-gray-700 font-medium">
                    Kód vyprší za <span className="font-bold text-blue-600">{timeLeft}</span> sekund
                  </p>
                </div>

                <div className="flex justify-center mb-4">
                  <div className={`w-full bg-gray-200 rounded-full h-3 ${
                    timeLeft <= 10 ? "bg-red-100" : "bg-gray-200"
                  }`}>
                    <div 
                      className={`h-3 rounded-full transition-all duration-1000 ${
                        timeLeft <= 10 ? "bg-red-500" : "bg-blue-600"
                      }`}
                      style={{ width: `${(timeLeft / 60) * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Backup Code Card */}
            <Card className="bg-white border-2 border-green-300 rounded-2xl shadow-strong">
              <CardContent className="p-6">
                <h4 className="font-bold text-lg text-gray-900 mb-4 flex items-center">
                  <QrCode className="w-5 h-5 mr-2 text-green-600" />
                  Záložní platební kód
                </h4>
                <div className="flex items-center justify-between bg-gray-100 rounded-xl p-4 border-2 border-gray-300">
                  <code className="text-xl font-mono font-bold text-gray-900">
                    {qrData.shortCode}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyCode}
                    className="h-10 px-4 text-green-600 hover:bg-green-100 font-semibold rounded-xl"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-600 font-medium mt-3">
                  Sdělte pokladníkovi tento kód, pokud nefunguje skenování QR
                </p>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefetching}
                className="flex-1 h-12 text-blue-600 border-blue-300 hover:bg-blue-50 font-semibold rounded-xl"
              >
                <RotateCcw className={`w-5 h-5 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
                {isRefetching ? "Obnovuji..." : "Nový kód"}
              </Button>
              <Button
                onClick={() => setLocation("/home")}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
              >
                Hotovo
              </Button>
            </div>

            {/* Instructions */}
            <Card className="bg-white border-2 border-purple-300 rounded-2xl shadow-strong">
              <CardContent className="p-6">
                <h4 className="font-bold text-lg text-gray-900 mb-4">Jak zaplatit</h4>
                <ol className="text-base text-gray-700 space-y-3 font-medium">
                  <li className="flex items-start">
                    <span className="font-bold text-purple-600 mr-3 text-lg">1.</span>
                    Ukažte QR kód nebo sdělte pokladníkovi záložní kód
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold text-purple-600 mr-3 text-lg">2.</span>
                    Pokladník zadá částku a naskenuje/napíše váš kód
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold text-purple-600 mr-3 text-lg">3.</span>
                    Potvrďte částku platby a dokončete nákup
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="bg-white border-2 border-red-300 rounded-2xl shadow-strong">
            <CardContent className="p-8 text-center">
              <p className="text-gray-700 font-medium mb-6">Nepodařilo se vygenerovat QR kód</p>
              <Button 
                onClick={handleRefresh}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl h-12 px-6"
              >
                Zkusit znovu
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
