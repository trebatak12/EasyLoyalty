import { Card, CardContent } from "@/components/ui/card";
import { Coffee, Store } from "lucide-react";
import { useLocation } from "wouter";

export default function ModeSelection() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl mb-6">
            <Coffee className="text-primary-foreground text-2xl" size={32} />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">EasyLoyalty</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Simple loyalty rewards for your favorite café. Top up your wallet, earn bonuses, and pay with ease.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Customer Mode */}
          <Card 
            className="card-easyloyalty cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setLocation("/auth/customer")}
          >
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-sage rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <Coffee className="text-white text-xl" size={24} />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">I'm a Customer</h3>
                <p className="text-muted-foreground mb-6">
                  Access your wallet, top up balance, and pay with QR codes
                </p>
                <div className="btn-primary w-full flex items-center justify-center">
                  Continue as Customer
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Café Admin Mode */}
          <Card 
            className="card-easyloyalty cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setLocation("/admin/login")}
          >
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <Store className="text-primary-foreground text-xl" size={24} />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">I'm Café Staff</h3>
                <p className="text-muted-foreground mb-6">
                  Accept payments, manage customers, and view analytics
                </p>
                <div className="btn-primary w-full flex items-center justify-center">
                  Continue as Staff
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
