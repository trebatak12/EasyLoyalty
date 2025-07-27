
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coffee, Store, Users, ShoppingBag, CreditCard, BarChart3, Gift, Smartphone } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

export default function ModeSelection() {
  const [, setLocation] = useLocation();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleKeyPress = (event: React.KeyboardEvent, path: string, role: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedRole(role);
      setLocation(path);
    }
  };

  const handleRoleSelect = (path: string, role: string) => {
    setSelectedRole(role);
    setLocation(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl mx-auto mb-8 flex items-center justify-center shadow-lg">
            <Coffee className="text-white" size={32} />
          </div>
          <h1 className="text-5xl font-bold text-amber-900 mb-4">
            Vyberte svou roli v EasyLoyalty
          </h1>
          <p className="text-xl text-amber-800 font-medium max-w-2xl mx-auto">
            Začněte používat moderní věrnostní systém pro vaši kavárnu
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Customer Card */}
          <Card 
            className="group bg-white/90 border border-amber-200 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer hover:scale-[1.02] focus-within:ring-4 focus-within:ring-amber-400/20 h-full"
            role="button"
            tabIndex={0}
            aria-pressed={selectedRole === 'customer'}
            onClick={() => handleRoleSelect("/auth/customer", "customer")}
            onKeyDown={(e) => handleKeyPress(e, "/auth/customer", "customer")}
          >
            <CardContent className="p-8 h-full">
              <div className="flex flex-col items-center text-center h-full">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl mb-6 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
                  <Users className="text-white" size={28} />
                </div>
                <h2 className="text-3xl font-bold text-amber-900 mb-4">Zákazník</h2>
                <p className="text-lg text-amber-800 font-medium mb-8 leading-relaxed min-h-[3.5rem] flex items-center">
                  Přístup k věrnostnímu účtu, dobíjení peněženky a sledování odměn
                </p>

                <div className="space-y-4 mb-8 w-full flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-3 text-amber-800 text-base">
                    <Gift size={20} className="text-amber-600 flex-shrink-0" />
                    <span className="font-medium">Bonusové kredity při dobití</span>
                  </div>
                  <div className="flex items-center gap-3 text-amber-800 text-base">
                    <Smartphone size={20} className="text-amber-600 flex-shrink-0" />
                    <span className="font-medium">Rychlé placení QR kódem</span>
                  </div>
                  <div className="flex items-center gap-3 text-amber-800 text-base">
                    <BarChart3 size={20} className="text-amber-600 flex-shrink-0" />
                    <span className="font-medium">Přehled všech nákupů</span>
                  </div>
                </div>

                <Button className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-semibold text-lg shadow-lg transition-all duration-200 focus-visible:ring-4 focus-visible:ring-amber-400/20 mt-auto">
                  Pokračovat jako zákazník
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Staff Card */}
          <Card 
            className="group bg-white/90 border border-amber-700/30 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer hover:scale-[1.02] focus-within:ring-4 focus-within:ring-amber-700/20 h-full"
            role="button"
            tabIndex={0}
            aria-pressed={selectedRole === 'staff'}
            onClick={() => handleRoleSelect("/admin/login", "staff")}
            onKeyDown={(e) => handleKeyPress(e, "/admin/login", "staff")}
          >
            <CardContent className="p-8 h-full">
              <div className="flex flex-col items-center text-center h-full">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-700 to-amber-800 rounded-3xl mb-6 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
                  <Store className="text-white" size={28} />
                </div>
                <h2 className="text-3xl font-bold text-amber-900 mb-4">Personál kavárny</h2>
                <p className="text-lg text-amber-800 font-medium mb-8 leading-relaxed min-h-[3.5rem] flex items-center">
                  Příjem plateb, správa zákazníků a obchodní analytics
                </p>

                <div className="space-y-4 mb-8 w-full flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-3 text-amber-800 text-base">
                    <CreditCard size={20} className="text-amber-700 flex-shrink-0" />
                    <span className="font-medium">Příjem plateb</span>
                  </div>
                  <div className="flex items-center gap-3 text-amber-800 text-base">
                    <Users size={20} className="text-amber-700 flex-shrink-0" />
                    <span className="font-medium">Správa zákazníků</span>
                  </div>
                  <div className="flex items-center gap-3 text-amber-800 text-base">
                    <BarChart3 size={20} className="text-amber-700 flex-shrink-0" />
                    <span className="font-medium">Obchodní analytics</span>
                  </div>
                </div>

                <Button className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white font-semibold text-lg shadow-lg transition-all duration-200 focus-visible:ring-4 focus-visible:ring-amber-700/20 mt-auto">
                  Přihlásit se jako personál
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xl text-amber-800 font-medium">
            Bezpečná správa věrnostního programu pro vaši kavárnu
          </p>
        </div>
      </div>
    </div>
  );
}
