import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coffee, Store, Users, ShoppingBag } from "lucide-react";
import { useLocation } from "wouter";

export default function ModeSelection() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg via-surface to-card flex items-center justify-center p-4 text-high-contrast">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl">
            <Coffee className="text-white" size={36} />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">EasyLoyalty</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose how you'd like to access the loyalty system
          </p>
        </div>

        {/* Mode Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Customer Mode */}
          <Card 
            className="bg-warm-white border border-warm rounded-3xl p-8 shadow-warm hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] group"
            onClick={() => setLocation("/auth/customer")}
          >
            <CardContent className="p-0 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-sage to-sage/80 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Users className="text-white" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Customer</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Access your loyalty account, top up your wallet, make payments, and track your rewards
              </p>
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShoppingBag size={16} />
                  <span>Wallet & Payments</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Coffee size={16} />
                  <span>Bonus Rewards</span>
                </div>
              </div>
              <Button className="w-full h-12 rounded-2xl bg-gradient-to-r from-sage to-sage/90 hover:from-sage/90 hover:to-sage text-white font-semibold shadow-lg">
                Continue as Customer
              </Button>
            </CardContent>
          </Card>

          {/* Admin Mode */}
          <Card 
            className="bg-warm-white border border-warm rounded-3xl p-8 shadow-warm hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] group"
            onClick={() => setLocation("/admin/login")}
          >
            <CardContent className="p-0 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Store className="text-white" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Café Staff</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Access payment processing, customer management, and business analytics dashboard
              </p>
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShoppingBag size={16} />
                  <span>Accept Payments</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users size={16} />
                  <span>Manage Customers</span>
                </div>
              </div>
              <Button className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary-hover hover:to-primary-hover/90 text-white font-semibold shadow-lg">
                Continue as Staff
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            Secure loyalty program management for your café
          </p>
        </div>
      </div>
    </div>
  );
}