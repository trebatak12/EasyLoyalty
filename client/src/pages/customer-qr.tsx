
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, Copy, QrCode } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { StyledQR } from "@/components/ui/styled-qr";

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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-6">
      <div className="container mx-auto max-w-md">
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/home")}
            className="mr-4 text-amber-800 hover:text-amber-900 hover:bg-amber-100 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        <h1 className="text-3xl font-bold text-amber-900 text-center mb-8">Platební QR kód</h1>

        {isLoading ? (
          <Card className="bg-white border-2 border-orange-200 rounded-3xl shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="animate-pulse">
                <div className="w-64 h-64 bg-orange-100 rounded-3xl mx-auto mb-6"></div>
                <div className="h-4 w-32 bg-orange-100 rounded mx-auto mb-4"></div>
                <div className="h-6 w-24 bg-orange-100 rounded mx-auto"></div>
              </div>
            </CardContent>
          </Card>
        ) : qrData ? (
          <div className="space-y-6">
            {/* Main QR Code Card */}
            <Card className="bg-white border-2 border-orange-200 rounded-3xl shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <div className="bg-gradient-to-br from-orange-100 to-yellow-100 p-8 rounded-3xl border border-orange-200 inline-block">
                    <StyledQR
                      value={qrData.qrPayload}
                      size={200}
                      className="drop-shadow-md"
                    />
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-amber-900 mb-3">
                    Ukažte tento QR kód pokladníkovi
                  </h3>
                  <p className="text-base text-amber-800 font-medium">
                    Kód vyprší za {timeLeft} sekund
                  </p>
                </div>

                <div className="flex justify-center mb-4">
                  <div className="w-full bg-orange-200 rounded-full h-4">
                    <div 
                      className="h-4 rounded-full transition-all duration-1000 bg-gradient-to-r from-orange-400 to-orange-500"
                      style={{ width: `${(timeLeft / 60) * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Backup Code Card */}
            <Card className="bg-white border-2 border-orange-200 rounded-3xl shadow-lg">
              <CardContent className="p-6">
                <h4 className="font-bold text-lg text-amber-900 mb-4 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center mr-3">
                    <QrCode className="w-4 h-4 text-white" />
                  </div>
                  Záložní platební kód
                </h4>
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-4 border border-orange-200 mb-4">
                  <div className="flex items-center justify-between">
                    <code className="text-xl font-mono font-bold text-amber-900">
                      {qrData.shortCode}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyCode}
                      className="h-10 px-4 text-orange-600 hover:bg-orange-100 font-semibold rounded-xl"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-amber-800 font-medium">
                  Sdělte pokladníkovi tento kód, pokud nefunguje skenování QR
                </p>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefetching}
                className="flex-1 h-14 text-amber-800 border-2 border-orange-300 bg-white hover:bg-orange-50 font-semibold rounded-2xl"
              >
                <RotateCcw className={`w-5 h-5 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
                {isRefetching ? "Obnovuji..." : "Nový kód"}
              </Button>
              <Button
                onClick={() => setLocation("/home")}
                className="flex-1 h-14 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-semibold rounded-2xl shadow-lg"
              >
                Hotovo
              </Button>
            </div>

            {/* Instructions */}
            <Card className="bg-white border-2 border-orange-200 rounded-3xl shadow-lg">
              <CardContent className="p-6">
                <h4 className="font-bold text-lg text-amber-900 mb-4">Jak zaplatit</h4>
                <ol className="text-base text-amber-800 space-y-3 font-medium">
                  <li className="flex items-start">
                    <span className="font-bold text-orange-600 mr-3 text-lg">1.</span>
                    Ukažte QR kód nebo sdělte pokladníkovi záložní kód
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold text-orange-600 mr-3 text-lg">2.</span>
                    Pokladník zadá částku a naskenuje/napíše váš kód
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold text-orange-600 mr-3 text-lg">3.</span>
                    Potvrďte částku platby a dokončete nákup
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="bg-white border-2 border-red-300 rounded-3xl shadow-lg">
            <CardContent className="p-8 text-center">
              <p className="text-red-800 font-medium mb-6">Nepodařilo se vygenerovat QR kód</p>
              <Button 
                onClick={handleRefresh}
                className="bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-semibold rounded-2xl h-12 px-6"
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
