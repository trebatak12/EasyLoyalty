
import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Coffee, LogOut, Scan, CreditCard, RotateCcw, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";

interface CustomerInfo {
  userId: string;
  customerName: string;
  customerEmail: string;
  balanceCZK: string;
  balanceCents: number;
}

interface ChargeResult {
  success: boolean;
  transactionId: string;
  chargeId: string;
  voidExpiresAt: number;
  newBalanceCZK: string;
  newBalanceCents: number;
}

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
      <p className="text-orange-700">Načítání...</p>
    </div>
  </div>
);

export default function POSCharge() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"scan" | "confirm" | "success">("scan");
  const [tokenOrCode, setTokenOrCode] = useState("");
  const [amount, setAmount] = useState("");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [chargeResult, setChargeResult] = useState<ChargeResult | null>(null);
  const [voidCountdown, setVoidCountdown] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Admin authentication hook
  const { isAuthenticated, isLoading, admin } = useAdminAuth();

  // Sound effects
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
  }, []);

  const playSound = (type: "success" | "error") => {
    if (audioRef.current) {
      // Simple beep using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = type === "success" ? 800 : 400;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    }
  };

  // Void countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (chargeResult && voidCountdown > 0) {
      interval = setInterval(() => {
        setVoidCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [chargeResult, voidCountdown]);

  const handleBackToDashboard = () => {
    setLocation("/admin/dashboard");
  };

  const initChargeMutation = useMutation({
    mutationFn: async ({ tokenOrCode, amount }: { tokenOrCode: string; amount: string }) => {
      const response = await fetch("/api/admin/charge/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenOrCode }),
        credentials: "include"
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Chyba při načítání zákazníka");
      }

      return response.json();
    },
    onSuccess: (data: CustomerInfo) => {
      setCustomerInfo(data);
      setStep("confirm");
      playSound("success");
    },
    onError: (error: any) => {
      toast({
        title: "Chyba načítání",
        description: error.message || "Neplatný QR kód nebo kód",
        variant: "destructive"
      });
      playSound("error");
    }
  });

  const confirmChargeMutation = useMutation({
    mutationFn: async ({ userId, amountCZK, idempotencyKey }: { userId: string; amountCZK: number; idempotencyKey: string }) => {
      const response = await fetch("/api/admin/charge/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amountCZK, idempotencyKey }),
        credentials: "include"
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Chyba při potvrzení platby");
      }

      return response.json();
    },
    onSuccess: (data: ChargeResult) => {
      setChargeResult(data);
      setVoidCountdown(120); // 120 seconds
      setStep("success");
      playSound("success");
      toast({
        title: "Platba úspěšná",
        description: `Účtováno ${amount} Kč`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba platby",
        description: error.message || "Platbu se nepodařilo zpracovat",
        variant: "destructive"
      });
      playSound("error");
    }
  });

  const voidChargeMutation = useMutation({
    mutationFn: async (chargeId: string) => {
      const response = await fetch("/api/admin/void", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chargeId }),
        credentials: "include"
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Chyba při stornování platby");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Platba stornována",
        description: "Částka byla vrácena zákazníkovi",
      });
      playSound("success");
      resetFlow();
    },
    onError: (error: any) => {
      toast({
        title: "Chyba storna",
        description: error.message || "Storno se nepodařilo",
        variant: "destructive"
      });
      playSound("error");
    }
  });

  const handleScan = () => {
    if (!tokenOrCode.trim()) {
      toast({
        title: "Chyba",
        description: "Zadejte QR kód nebo krátký kód",
        variant: "destructive"
      });
      return;
    }
    initChargeMutation.mutate({ tokenOrCode: tokenOrCode.trim(), amount });
  };

  const handleCharge = () => {
    if (!customerInfo || !amount) return;

    const amountCZK = parseFloat(amount);
    if (isNaN(amountCZK) || amountCZK <= 0) {
      toast({
        title: "Chyba",
        description: "Zadejte platnou částku",
        variant: "destructive"
      });
      return;
    }

    if (amountCZK * 100 > customerInfo.balanceCents) {
      toast({
        title: "Nedostatečný zůstatek",
        description: "Zákazník nemá dostatek prostředků",
        variant: "destructive"
      });
      return;
    }

    confirmChargeMutation.mutate({ userId: customerInfo.userId, amountCZK, idempotencyKey: `pos-charge-${Date.now()}-${Math.random()}` });
  };

  const handleVoid = () => {
    if (chargeResult?.chargeId) {
      voidChargeMutation.mutate(chargeResult.chargeId);
    }
  };

  const resetFlow = () => {
    setStep("scan");
    setTokenOrCode("");
    setAmount("");
    setCustomerInfo(null);
    setChargeResult(null);
    setVoidCountdown(0);
  };

  if (isLoading || !isAuthenticated) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header - stejný styl jako admin dashboard */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Coffee className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-stone-800">POS System</h1>
                <p className="text-sm text-stone-600">Pokladna • {admin?.name}</p>
              </div>
            </div>
            <Button 
              variant="outline"
              onClick={handleBackToDashboard}
              className="border-orange-200 text-orange-600 hover:bg-orange-50 rounded-xl p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-4xl">
        {step === "scan" && (
          <Card className="border-0 shadow-lg rounded-3xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl font-bold text-stone-800">
                <Scan className="w-6 h-6 mr-3" />
                Načtení zákazníka
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="tokenOrCode" className="text-stone-700 font-medium mb-2 block">
                  QR kód nebo krátký kód
                </Label>
                <Input
                  id="tokenOrCode"
                  value={tokenOrCode}
                  onChange={(e) => setTokenOrCode(e.target.value)}
                  placeholder="Naskenujte QR kód nebo zadejte krátký kód"
                  className="h-12 text-lg rounded-xl border-stone-300 focus:border-orange-500 focus:ring-orange-500"
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                  disabled={initChargeMutation.isPending}
                />
              </div>
              <Button
                onClick={handleScan}
                disabled={initChargeMutation.isPending || !tokenOrCode.trim()}
                className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl"
              >
                {initChargeMutation.isPending ? "Načítání..." : "Načíst zákazníka"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "confirm" && customerInfo && (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg rounded-3xl bg-gradient-to-br from-green-50 to-green-100">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl font-bold text-green-800">
                  <CheckCircle className="w-6 h-6 mr-3" />
                  Informace o zákazníkovi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-green-700 font-medium">Jméno</Label>
                    <p className="text-lg font-semibold text-green-900 mt-1">{customerInfo.customerName}</p>
                  </div>
                  <div>
                    <Label className="text-green-700 font-medium">Email</Label>
                    <p className="text-sm text-green-800 mt-1">{customerInfo.customerEmail}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-green-700 font-medium">Aktuální zůstatek</Label>
                    <p className="text-3xl font-bold text-green-900 mt-1">{customerInfo.balanceCZK}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg rounded-3xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl font-bold text-stone-800">
                  <CreditCard className="w-6 h-6 mr-3" />
                  Účtování platby
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="amount" className="text-stone-700 font-medium mb-2 block">
                    Částka k účtování (Kč)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-12 text-xl rounded-xl border-stone-300 focus:border-orange-500 focus:ring-orange-500"
                    disabled={confirmChargeMutation.isPending}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleCharge}
                    disabled={confirmChargeMutation.isPending || !amount}
                    className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl"
                  >
                    {confirmChargeMutation.isPending ? "Zpracovávání..." : "Potvrdit platbu"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetFlow}
                    className="h-12 border-orange-200 text-orange-600 hover:bg-orange-50 font-medium rounded-xl px-8"
                  >
                    Zrušit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "success" && chargeResult && (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg rounded-3xl bg-gradient-to-br from-green-50 to-green-100">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl font-bold text-green-800">
                  <CheckCircle className="w-6 h-6 mr-3" />
                  Platba úspěšná
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-green-700 font-medium">Účtovaná částka</Label>
                    <p className="text-3xl font-bold text-green-900 mt-1">{amount} Kč</p>
                  </div>
                  <div>
                    <Label className="text-green-700 font-medium">Nový zůstatek</Label>
                    <p className="text-xl font-semibold text-green-800 mt-1">{chargeResult.newBalanceCZK}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-green-700 font-medium">ID transakce</Label>
                    <p className="text-sm font-mono text-green-800 mt-1 break-all">{chargeResult.transactionId}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {voidCountdown > 0 && (
              <Card className="border-0 shadow-lg rounded-3xl bg-gradient-to-br from-orange-50 to-orange-100">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-xl font-bold text-orange-800">
                    <AlertCircle className="w-6 h-6 mr-3" />
                    Možnost storna
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-orange-800 text-lg">
                        Platbu lze stornovat ještě <span className="font-bold text-xl">{voidCountdown}s</span>
                      </p>
                    </div>
                    <Button
                      onClick={handleVoid}
                      disabled={voidChargeMutation.isPending}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl h-12 px-6"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {voidChargeMutation.isPending ? "Stornování..." : "Stornovat"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="text-center">
              <Button
                onClick={resetFlow}
                className="h-12 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl px-8"
              >
                Nová platba
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
