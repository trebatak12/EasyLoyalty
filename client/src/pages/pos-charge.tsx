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

  // Check POS authentication
  const { data: admin, error } = useQuery({
    queryKey: ["/api/pos/me"],
    queryFn: async () => {
      const response = await fetch("/api/pos/me", {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Nepřihlášen");
      }
      return response.json();
    },
    retry: false
  });

  useEffect(() => {
    if (error && error.message.includes("401")) {
      setLocation("/pos/login");
    }
  }, [error, setLocation]);

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
    mutationFn: async () => {
      const response = await fetch("/api/pos/logout", {
        method: "POST",
        credentials: "include"
      });
      return response.json();
    },
    onSuccess: () => {
      setLocation("/pos/login");
    }
  });

  const scanMutation = useMutation({
    mutationFn: async (tokenOrCode: string) => {
      return await apiRequest("/api/pos/charge/init", {
        method: "POST",
        body: { tokenOrCode }
      });
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

  const chargeMutation = useMutation({
    mutationFn: async ({ userId, amountCZK }: { userId: string; amountCZK: number }) => {
      const idempotencyKey = `pos-charge-${Date.now()}-${Math.random()}`;
      return await apiRequest("/api/pos/charge/confirm", {
        method: "POST",
        body: { userId, amountCZK, idempotencyKey }
      });
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

  const voidMutation = useMutation({
    mutationFn: async (chargeId: string) => {
      return await apiRequest("/api/pos/void", {
        method: "POST",
        body: { chargeId }
      });
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
    scanMutation.mutate(tokenOrCode.trim());
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

    chargeMutation.mutate({ userId: customerInfo.userId, amountCZK });
  };

  const handleVoid = () => {
    if (chargeResult?.chargeId) {
      voidMutation.mutate(chargeResult.chargeId);
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

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
          <p className="mt-2 text-amber-700">Načítání...</p>
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
              <p className="text-sm text-amber-700">Pokladna • {admin.name}</p>
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
                  disabled={scanMutation.isPending}
                />
              </div>
              <Button 
                onClick={handleScan}
                disabled={scanMutation.isPending || !tokenOrCode.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {scanMutation.isPending ? "Načítání..." : "Načíst zákazníka"}
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
                    disabled={chargeMutation.isPending}
                  />
                </div>
                <div className="flex space-x-3">
                  <Button 
                    onClick={handleCharge}
                    disabled={chargeMutation.isPending || !amount}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3"
                  >
                    {chargeMutation.isPending ? "Zpracovávání..." : "Potvrdit platbu"}
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
                      disabled={voidMutation.isPending}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {voidMutation.isPending ? "Stornování..." : "Stornovat"}
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
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CreditCard, User, DollarSign } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/currency";

interface ChargeData {
  amount: number;
  customerEmail?: string;
  note?: string;
}

export default function POSCharge() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [note, setNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const chargeMutation = useMutation({
    mutationFn: async (data: ChargeData) => {
      const response = await api.post("/pos/charge", {
        amountCents: Math.round(data.amount * 100),
        customerEmail: data.customerEmail,
        note: data.note
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Platba úspěšná",
        description: `Částka ${formatCurrency(data.amountCents / 100)} byla úspěšně účtována.`,
        variant: "default"
      });
      // Reset form
      setAmount("");
      setCustomerEmail("");
      setNote("");
    },
    onError: (error: any) => {
      toast({
        title: "Chyba při zpracování platby",
        description: error.response?.data?.message || "Neočekávaná chyba",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast({
        title: "Neplatná částka",
        description: "Zadejte platnou částku větší než 0",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    chargeMutation.mutate({
      amount: amountNum,
      customerEmail: customerEmail || undefined,
      note: note || undefined
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/pos/login")}
            className="rounded-full"
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold text-amber-900">Přijmout platbu</h1>
        </div>

        {/* Charge Form */}
        <Card className="bg-white/80 backdrop-blur border-amber-200 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <CreditCard size={20} />
              Nová platba
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="amount" className="text-amber-800">
                  Částka (Kč) *
                </Label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-600" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-10 border-amber-200 focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customerEmail" className="text-amber-800">
                  Email zákazníka (volitelné)
                </Label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-600" />
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="zakaznik@email.cz"
                    className="pl-10 border-amber-200 focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="note" className="text-amber-800">
                  Poznámka (volitelné)
                </Label>
                <Input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Poznámka k platbě"
                  className="border-amber-200 focus:border-amber-400"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                disabled={isProcessing}
              >
                {isProcessing ? "Zpracovávám..." : "Přijmout platbu"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Amount Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[50, 100, 200, 500].map((quickAmount) => (
            <Button
              key={quickAmount}
              variant="outline"
              onClick={() => setAmount(quickAmount.toString())}
              className="border-amber-200 text-amber-800 hover:bg-amber-50"
            >
              {quickAmount} Kč
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
