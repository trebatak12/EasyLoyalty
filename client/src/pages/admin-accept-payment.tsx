import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Camera, LogOut, Check, RotateCcw } from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/currency";
import { generateIdempotencyKey } from "@/utils/idempotency";
import { CountdownTimer } from "@/components/ui/countdown-timer";
import { useLocation } from "wouter";

type PaymentStep = "amount" | "scan" | "confirm" | "success";

interface ChargeData {
  userId: string;
  customerName: string;
  balanceCZK: string;
  balanceCents: number;
  chargeId: string;
}

interface VoidTimer {
  chargeId: string;
  expiresAt: number;
}

export default function AdminAcceptPayment() {
  const [, setLocation] = useLocation();
  const { admin, logout, isAuthenticated } = useAdminAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<PaymentStep>("amount");
  const [amount, setAmount] = useState("");
  const [tokenOrCode, setTokenOrCode] = useState("");
  const [chargeData, setChargeData] = useState<ChargeData | null>(null);
  const [voidTimer, setVoidTimer] = useState<VoidTimer | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, setLocation]);

  const initChargeMutation = useMutation({
    mutationFn: (data: { tokenOrCode: string }) => api.post("/api/admin/charge/init", data),
    onSuccess: (data: ChargeData) => {
      setChargeData(data);
      setStep("confirm");
    },
    onError: (error: any) => {
      toast({
        title: "Invalid QR Code",
        description: error.message || "Failed to initialize charge",
        variant: "destructive"
      });
    }
  });

  const confirmChargeMutation = useMutation({
    mutationFn: (data: { chargeId: string; amountCZK: number; idempotencyKey: string }) => 
      api.post("/api/admin/charge/confirm", data),
    onSuccess: (data) => {
      if (chargeData) {
        setChargeData({ ...chargeData, balanceCZK: data.newBalanceCZK, balanceCents: data.newBalanceCents });
      }
      setVoidTimer({
        chargeId: chargeData!.chargeId,
        expiresAt: Date.now() + 120000 // 2 minutes
      });
      setStep("success");
      toast({
        title: "Payment Successful",
        description: `Charged ${formatCurrency(parseFloat(amount) * 100)} from ${chargeData?.customerName}`,
        variant: "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Charge Failed",
        description: error.message || "Failed to process charge",
        variant: "destructive"
      });
    }
  });

  const voidChargeMutation = useMutation({
    mutationFn: (data: { chargeId: string }) => api.post("/api/admin/charge/void", data),
    onSuccess: () => {
      toast({
        title: "Payment Voided",
        description: "The payment has been successfully voided and balance restored",
        variant: "default"
      });
      resetPaymentFlow();
    },
    onError: (error: any) => {
      toast({
        title: "Void Failed",
        description: error.message || "Failed to void payment",
        variant: "destructive"
      });
    }
  });

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const handleAmountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }
    setStep("scan");
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenOrCode.trim()) {
      toast({
        title: "Invalid Code",
        description: "Please enter a QR code or manual code",
        variant: "destructive"
      });
      return;
    }
    initChargeMutation.mutate({ tokenOrCode: tokenOrCode.trim() });
  };

  const handleConfirmCharge = () => {
    if (!chargeData) return;
    
    const amountCZK = parseFloat(amount);
    if (chargeData.balanceCents < amountCZK * 100) {
      toast({
        title: "Insufficient Funds",
        description: "Customer does not have enough balance for this payment",
        variant: "destructive"
      });
      return;
    }

    confirmChargeMutation.mutate({
      chargeId: chargeData.chargeId,
      amountCZK,
      idempotencyKey: generateIdempotencyKey()
    });
  };

  const handleVoidPayment = () => {
    if (!voidTimer) return;
    voidChargeMutation.mutate({ chargeId: voidTimer.chargeId });
  };

  const resetPaymentFlow = () => {
    setStep("amount");
    setAmount("");
    setTokenOrCode("");
    setChargeData(null);
    setVoidTimer(null);
  };

  const quickAmounts = [85, 120, 178, 250];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-white text-high-contrast">
      {/* Header */}
      <div className="bg-white border-b-2 border-blue-200 sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
                <Store className="text-white" size={20} />
              </div>
              <div>
                <p className="font-bold text-xl text-gray-900">{admin?.name}</p>
                <p className="text-base text-gray-700 font-medium">{admin?.role}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold rounded-xl px-4 py-2"
            >
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Accept Payment</h1>

        <Card className="bg-white border-2 border-blue-300 rounded-3xl shadow-strong">
          <CardContent className="pt-6">
            {/* Step 1: Amount Entry */}
            {step === "amount" && (
              <form onSubmit={handleAmountSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="amount" className="text-base font-bold text-gray-900 mb-2 block">
                    Amount (CZK)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="85"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-12 rounded-2xl border-2 border-blue-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium text-lg transition-colors"
                    required
                  />
                </div>

                <div>
                  <Label className="text-base font-bold text-gray-900 mb-2 block">
                    Quick Amounts
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {quickAmounts.map((quickAmount) => (
                      <Button
                        key={quickAmount}
                        type="button"
                        variant="outline"
                        onClick={() => setAmount(quickAmount.toString())}
                        className="h-10"
                      >
                        {quickAmount}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg transition-all duration-200">
                  Continue →
                </Button>
              </form>
            )}

            {/* Step 2: QR Scan/Manual Entry */}
            {step === "scan" && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Amount: {formatCurrency(parseFloat(amount) * 100)}
                  </h3>
                  <p className="text-lg text-gray-700 font-medium">Scan QR code or enter manual code</p>
                </div>

                <form onSubmit={handleScanSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="tokenOrCode" className="text-base font-bold text-gray-900 mb-2 block">
                      QR Code or Manual Code
                    </Label>
                    <div className="flex space-x-3">
                      <Input
                        id="tokenOrCode"
                        type="text"
                        placeholder="ABC123XY or scan QR"
                        value={tokenOrCode}
                        onChange={(e) => setTokenOrCode(e.target.value)}
                        className="input-easyloyalty flex-1"
                        required
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        className="w-12 h-12 p-0"
                        onClick={() => {
                          toast({
                            title: "Camera Not Available",
                            description: "Please enter the manual code",
                            variant: "default"
                          });
                        }}
                      >
                        <Camera size={20} />
                      </Button>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setStep("amount")}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      className="btn-primary flex-1"
                      disabled={initChargeMutation.isPending}
                    >
                      {initChargeMutation.isPending ? "Validating..." : "Continue"}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 3: Confirm Charge */}
            {step === "confirm" && chargeData && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Confirm Payment</h3>
                </div>

                <div className="bg-muted rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Customer</span>
                    <span className="font-medium text-foreground">{chargeData.customerName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current Balance</span>
                    <span className="font-medium text-foreground currency-display">{chargeData.balanceCZK}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Charge Amount</span>
                    <span className="font-semibold text-foreground currency-display">
                      {formatCurrency(parseFloat(amount) * 100)}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button 
                    onClick={() => setStep("scan")} 
                    variant="outline"
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={handleConfirmCharge}
                    className="flex-1 bg-sage hover:bg-sage/90 text-white"
                    disabled={confirmChargeMutation.isPending}
                  >
                    {confirmChargeMutation.isPending ? "Processing..." : "Charge"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Success with Void Option */}
            {step === "success" && chargeData && (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-sage rounded-full mx-auto flex items-center justify-center">
                  <Check className="text-white text-xl" size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">Payment Successful</h4>
                  <p className="text-muted-foreground">
                    Charged {formatCurrency(parseFloat(amount) * 100)} from {chargeData.customerName}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    New balance: <span className="font-medium text-foreground currency-display">{chargeData.balanceCZK}</span>
                  </p>
                </div>

                {/* Void Window */}
                {voidTimer && (
                  <Card className="bg-destructive/10 border-destructive/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">Void window</span>
                        <CountdownTimer 
                          targetTime={voidTimer.expiresAt}
                          className="text-sm font-mono text-foreground"
                          onExpire={() => setVoidTimer(null)}
                        />
                      </div>
                      <Button 
                        onClick={handleVoidPayment}
                        disabled={voidChargeMutation.isPending || !voidTimer}
                        className="w-full h-10 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {voidChargeMutation.isPending ? "Voiding..." : "Void Payment"}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Button 
                  onClick={resetPaymentFlow} 
                  className="btn-primary w-full"
                >
                  New Payment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
