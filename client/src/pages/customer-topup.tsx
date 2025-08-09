import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Plus, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/currency";

const packages = [
  {
    code: "MINI" as const,
    name: "MINI",
    pay: 39000,
    bonus: 3000,
    total: 42000,
    percentage: "~7.7%",
    icon: "💰"
  },
  {
    code: "STANDARD" as const,
    name: "STANDARD",
    pay: 89000,
    bonus: 9000,
    total: 98000,
    percentage: "~10.1%",
    popular: true,
    icon: "⭐"
  },
  {
    code: "MAXI" as const,
    name: "MAXI",
    pay: 159000,
    bonus: 23000,
    total: 182000,
    percentage: "~14.5%",
    icon: "🚀"
  },
  {
    code: "ULTRA" as const,
    name: "ULTRA",
    pay: 209000,
    bonus: 40000,
    total: 249000,
    percentage: "~19.1%",
    icon: "💎"
  }
];

export default function CustomerTopup() {
  const [, setLocation] = useLocation();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const topupMutation = useMutation({
    mutationFn: (packageCode: string) => {
      // Generate idempotency key to prevent duplicate submissions
      const idempotencyKey = Math.random().toString(36).substring(2) + Date.now().toString(36);

      return api.post("/api/me/topup", { packageCode }, {
        headers: {
          'Idempotency-Key': idempotencyKey
        }
      });
    },
    onSuccess: (data) => {
      const message = data.idempotent
        ? "Top-up already processed - wallet unchanged"
        : "Top-up successful! Your wallet has been updated.";

      toast({
        title: data.idempotent ? "Already Processed" : "Top-up Successful!",
        description: message,
        variant: "default"
      });

      // Invalidate queries first
      queryClient.invalidateQueries({ queryKey: ["/api/me/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me/history"] });

      // Navigate home with refresh parameter after small delay
      setTimeout(() => {
        setLocation("/home?refreshData=true");
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Top-up Failed",
        description: error.message || "Failed to process top-up",
        variant: "destructive"
      });
    }
  });

  const handleTopup = (packageCode: string) => {
    if (selectedPackage === packageCode) {
      // Prevent double-clicks during processing
      if (!topupMutation.isPending) {
        topupMutation.mutate(packageCode);
      }
    } else {
      setSelectedPackage(packageCode);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F5F0E8 0%, #F8F5EE 50%, #FDF9F0 100%)' }}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/home")}
            className="mr-4 text-stone-700 hover:text-stone-900 hover:bg-stone-100/50 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-stone-800 mb-2">Top Up Your Wallet</h1>
            <p className="text-stone-600 text-lg">Choose a package and get bonus credits</p>
          </div>
        </div>

        {/* Benefits Banner */}
        <Card className="mb-8 border-0 shadow-lg overflow-hidden">
          <CardContent className="p-0">
            <div style={{ background: 'linear-gradient(135deg, #4CAF50 0%, #45A049 100%)' }} className="text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-1">Get Bonus Credits!</h3>
                    <p className="text-green-100 text-base">The more you top up, the bigger bonus you get</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-100 text-sm">Up to</p>
                  <p className="text-3xl font-bold">19% bonus</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Package Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {packages.map((pkg) => (
            <Card
              key={pkg.code}
              className={`relative cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-0 shadow-lg ${
                selectedPackage === pkg.code
                  ? "ring-4 ring-orange-300"
                  : ""
              }`}
              style={{
                background: pkg.popular
                  ? 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)'
                  : 'linear-gradient(135deg, #FEFEFE 0%, #F8F5F0 100%)',
                border: pkg.popular ? '3px solid #FF9800' : '2px solid #E0D5C7'
              }}
              onClick={() => handleTopup(pkg.code)}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div
                    className="text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap"
                    style={{ background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)' }}
                  >
                    Most Popular
                  </div>
                </div>
              )}

              <CardContent className="p-6 text-center min-h-[480px] flex flex-col justify-between">
                <div className="flex-1 flex flex-col">
                  <div className="text-4xl mb-4 mt-2">{pkg.icon}</div>
                  <h4 className="font-bold text-2xl text-stone-800 mb-6 px-1">{pkg.name}</h4>

                  <div className="mb-6">
                    <p className="text-3xl font-bold text-stone-800 mb-3 leading-tight">
                      {formatCurrency(pkg.pay)}
                    </p>
                    <div className="flex items-center justify-center gap-1 text-green-600">
                      <Plus className="w-5 h-5 flex-shrink-0" />
                      <span className="text-lg font-semibold">
                        {formatCurrency(pkg.bonus)} bonus
                      </span>
                    </div>
                  </div>

                  <div className="bg-stone-50 rounded-2xl p-4 mb-8 flex-1 flex flex-col justify-center">
                    <p className="text-base text-stone-600 mb-2">You get total</p>
                    <p className="text-2xl font-bold text-stone-800 mb-2 leading-tight">{formatCurrency(pkg.total)}</p>
                    <p className="text-base text-green-600 font-medium">{pkg.percentage} bonus</p>
                  </div>
                </div>

                {selectedPackage === pkg.code ? (
                  <Button
                    className="w-full h-14 text-base font-bold text-white rounded-2xl shadow-lg transition-all duration-200"
                    style={{
                      background: topupMutation.isPending
                        ? 'linear-gradient(135deg, #9E9E9E 0%, #757575 100%)'
                        : 'linear-gradient(135deg, #4CAF50 0%, #45A049 100%)'
                    }}
                    disabled={topupMutation.isPending}
                  >
                    {topupMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span style={{ color: 'white' }}>Processing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        <span style={{ color: 'white' }}>Confirm Purchase</span>
                      </div>
                    )}
                  </Button>
                ) : (
                  <Button
                    className="w-full h-14 text-base font-bold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl"
                    style={pkg.popular ? {
                      background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                      color: 'white'
                    } : {
                      background: 'linear-gradient(135deg, #FFB74D 0%, #FFA726 100%)',
                      color: 'white'
                    }}
                  >
                    <span style={{ color: 'white' }}>Select Package</span>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Confirmation Card */}
        {selectedPackage && (
          <Card className="border-0 shadow-xl max-w-md mx-auto" style={{ background: 'linear-gradient(135deg, #FEFEFE 0%, #F8F5F0 100%)', border: '3px solid #4CAF50' }}>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4CAF50 0%, #45A049 100%)' }}>
                <Check className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-stone-800 mb-2">
                Ready to Confirm?
              </h3>
              <p className="text-stone-600 mb-6">
                Click the selected package above to complete your top-up, or cancel to choose a different option.
              </p>
              <Button
                onClick={() => setSelectedPackage(null)}
                className="border-2 border-stone-300 text-stone-700 hover:border-stone-400 hover:bg-stone-50 rounded-2xl px-8 py-3 bg-white"
              >
                Cancel Selection
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}