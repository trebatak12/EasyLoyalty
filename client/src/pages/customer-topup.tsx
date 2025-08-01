
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
      queryClient.invalidateQueries({ queryKey: ["/api/me/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me/history"] });
      setLocation("/home");
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
    <div className="min-h-screen bg-gradient-to-br from-white via-green-50/30 to-amber-50/20">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/home")}
            className="mr-4 text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Top Up Your Wallet</h1>
            <p className="text-gray-600">Choose a package and get bonus credits</p>
          </div>
        </div>

        {/* Benefits Banner */}
        <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white mb-8 border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Get Bonus Credits!</h3>
                  <p className="text-green-100">The more you top up, the bigger bonus you get</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-green-100 text-sm">Up to</p>
                <p className="text-2xl font-bold">19% bonus</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Package Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {packages.map((pkg) => (
            <Card 
              key={pkg.code}
              className={`relative cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl border-2 ${
                selectedPackage === pkg.code 
                  ? "border-green-500 bg-white shadow-2xl ring-4 ring-green-100" 
                  : pkg.popular 
                    ? "border-amber-300 bg-gradient-to-br from-white to-amber-50/50 shadow-xl" 
                    : "border-gray-200 bg-white hover:border-green-300 shadow-lg"
              }`}
              onClick={() => handleTopup(pkg.code)}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    Most Popular
                  </div>
                </div>
              )}
              
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-3">{pkg.icon}</div>
                <h4 className="font-bold text-lg text-gray-900 mb-2">{pkg.name}</h4>
                
                <div className="mb-4">
                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    {formatCurrency(pkg.pay)}
                  </p>
                  <div className="flex items-center justify-center gap-1 text-green-600">
                    <Plus className="w-3 h-3" />
                    <span className="text-sm font-semibold">
                      {formatCurrency(pkg.bonus)} bonus
                    </span>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  <p className="text-sm text-gray-600 mb-1">You get total</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(pkg.total)}</p>
                  <p className="text-xs text-green-600 font-medium">{pkg.percentage} bonus</p>
                </div>
                
                {selectedPackage === pkg.code ? (
                  <Button 
                    className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg transition-all duration-200"
                    disabled={topupMutation.isPending}
                  >
                    {topupMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        Confirm Purchase
                      </div>
                    )}
                  </Button>
                ) : (
                  <Button 
                    className={`w-full h-12 text-base font-semibold rounded-xl transition-all duration-200 ${
                      pkg.popular 
                        ? "bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-lg" 
                        : "bg-gray-100 hover:bg-green-50 text-gray-700 hover:text-green-700 border border-gray-200 hover:border-green-300"
                    }`}
                  >
                    Select Package
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Confirmation Card */}
        {selectedPackage && (
          <Card className="bg-white border-2 border-green-200 shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Ready to Confirm?
              </h3>
              <p className="text-gray-600 mb-6">
                Click the selected package above to complete your top-up, or cancel to choose a different option.
              </p>
              <Button
                variant="outline"
                onClick={() => setSelectedPackage(null)}
                className="border-2 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 rounded-xl px-8 py-3"
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
