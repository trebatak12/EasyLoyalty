import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Coffee, LogOut, Scan, CreditCard, RotateCcw, CheckCircle, AlertCircle } from "lucide-react";
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
  const { isAuthenticated, isLoading, logout } = useAdminAuth();

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

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      setLocation("/admin/login");
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive"
      });
    }
  });

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <Coffee className="w-16 h-16 text-amber-600 mx-auto mb-4" />
          <p className="text-amber-700">Načítání...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      {/* Header */}
      <div className="bg-white border-b-2 border-amber-200 p-4 shadow-sm">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center space-x-3">
            <Coffee className="w-8 h-8 text-amber-600" />
            <div>
              <h1 className="text-xl font-bold text-amber-900">EasyLoyalty POS</h1>
              <p className="text-sm text-amber-700">Pokladna</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => logoutMutation.mutate()}
            className="border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Odhlásit
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {step === "scan" && (
          <Card className="border-2 border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center text-amber-900">
                <Scan className="w-6 h-6 mr-2" />
                Načtení zákazníka
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tokenOrCode" className="text-amber-800 font-medium">
                  QR kód nebo krátký kód
                </Label>
                <Input
                  id="tokenOrCode"
                  value={tokenOrCode}
                  onChange={(e) => setTokenOrCode(e.target.value)}
                  placeholder="Naskenujte QR kód nebo zadejte krátký kód"
                  className="border-amber-200 focus:border-amber-500 focus:ring-amber-500"
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                  disabled={initChargeMutation.isPending}
                />
              </div>
              <Button
                onClick={handleScan}
                disabled={initChargeMutation.isPending || !tokenOrCode.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {initChargeMutation.isPending ? "Načítání..." : "Načíst zákazníka"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "confirm" && customerInfo && (
          <div className="space-y-6">
            <Card className="border-2 border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <CheckCircle className="w-6 h-6 mr-2" />
                  Informace o zákazníkovi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-green-700">Jméno</Label>
                    <p className="text-lg font-semibold text-green-900">{customerInfo.customerName}</p>
                  </div>
                  <div>
                    <Label className="text-green-700">Email</Label>
                    <p className="text-sm text-green-800">{customerInfo.customerEmail}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-green-700">Aktuální zůstatek</Label>
                    <p className="text-2xl font-bold text-green-900">{customerInfo.balanceCZK}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center text-amber-900">
                  <CreditCard className="w-6 h-6 mr-2" />
                  Účtování platby
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="amount" className="text-amber-800 font-medium">
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
                    className="border-amber-200 focus:border-amber-500 focus:ring-amber-500 text-lg"
                    disabled={confirmChargeMutation.isPending}
                  />
                </div>
                <div className="flex space-x-3">
                  <Button
                    onClick={handleCharge}
                    disabled={confirmChargeMutation.isPending || !amount}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3"
                  >
                    {confirmChargeMutation.isPending ? "Zpracovávání..." : "Potvrdit platbu"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetFlow}
                    className="border-amber-200 text-amber-700 hover:bg-amber-50"
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
            <Card className="border-2 border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <CheckCircle className="w-6 h-6 mr-2" />
                  Platba úspěšná
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-green-700">Účtovaná částka</Label>
                    <p className="text-2xl font-bold text-green-900">{amount} Kč</p>
                  </div>
                  <div>
                    <Label className="text-green-700">Nový zůstatek</Label>
                    <p className="text-xl font-semibold text-green-800">{chargeResult.newBalanceCZK}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-green-700">ID transakce</Label>
                    <p className="text-sm font-mono text-green-800">{chargeResult.transactionId}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {voidCountdown > 0 && (
              <Card className="border-2 border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-orange-800">
                    <AlertCircle className="w-6 h-6 mr-2" />
                    Možnost storna
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-800">
                        Platbu lze stornovat ještě <span className="font-bold">{voidCountdown}s</span>
                      </p>
                    </div>
                    <Button
                      onClick={handleVoid}
                      disabled={voidChargeMutation.isPending}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {voidChargeMutation.isPending ? "Stornování..." : "Stornovat"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center">
              <Button
                onClick={resetFlow}
                className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3"
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