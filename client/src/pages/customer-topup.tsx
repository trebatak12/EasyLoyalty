import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";
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
    percentage: "~7.7%"
  },
  {
    code: "STANDARD" as const,
    name: "STANDARD",
    pay: 89000,
    bonus: 9000,
    total: 98000,
    percentage: "~10.1%",
    popular: true
  },
  {
    code: "MAXI" as const,
    name: "MAXI",
    pay: 159000,
    bonus: 23000,
    total: 182000,
    percentage: "~14.5%"
  },
  {
    code: "ULTRA" as const,
    name: "ULTRA",
    pay: 209000,
    bonus: 40000,
    total: 249000,
    percentage: "~19.1%"
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/home")}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Choose Top-up Package</h1>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {packages.map((pkg) => (
            <Card 
              key={pkg.code}
              className={`card-easyloyalty cursor-pointer transition-all hover:shadow-lg ${
                selectedPackage === pkg.code 
                  ? "ring-2 ring-primary border-primary" 
                  : pkg.popular 
                    ? "ring-2 ring-sage border-sage" 
                    : "hover:border-primary"
              }`}
              onClick={() => handleTopup(pkg.code)}
            >
              <CardContent className="p-6">
                <div className="text-center">
                  {pkg.popular && (
                    <div className="inline-block bg-sage text-white text-xs px-2 py-1 rounded-full mb-2">
                      Popular
                    </div>
                  )}
                  <h4 className="font-semibold text-foreground mb-2">{pkg.name}</h4>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-foreground currency-display">
                      {formatCurrency(pkg.pay)}
                    </p>
                    <p className="text-sm text-sage">
                      +{formatCurrency(pkg.bonus)} bonus
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    You get {formatCurrency(pkg.total)} total<br />
                    {pkg.percentage} bonus
                  </p>
                  
                  {selectedPackage === pkg.code ? (
                    <Button 
                      className={`w-full h-10 text-sm font-medium transition-colors ${
                        pkg.popular ? "bg-sage hover:bg-sage/90 text-white" : "btn-primary"
                      }`}
                      disabled={topupMutation.isPending}
                    >
                      {topupMutation.isPending ? (
                        "Processing..."
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Confirm
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      className={`w-full h-10 text-sm font-medium transition-colors ${
                        pkg.popular 
                          ? "bg-sage hover:bg-sage/90 text-white" 
                          : "btn-secondary hover:bg-primary hover:text-primary-foreground"
                      }`}
                    >
                      Select
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedPackage && (
          <Card className="card-easyloyalty mt-8">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Confirm Top-up
                </h3>
                <p className="text-muted-foreground mb-4">
                  Click the selected package again to confirm your top-up
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSelectedPackage(null)}
                >
                  Cancel Selection
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
