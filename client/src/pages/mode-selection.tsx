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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-900 dark:via-orange-900 dark:to-yellow-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-amber-500 dark:bg-amber-600 rounded-2xl mx-auto mb-8 flex items-center justify-center shadow-xl">
            <Coffee className="text-white" size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-amber-900 dark:text-amber-100 mb-4">
            Vyberte svou roli v EasyLoyalty
          </h1>
          <p className="text-xl text-amber-800 dark:text-amber-200 font-medium max-w-2xl mx-auto">
            Začněte používat moderní věrnostní systém pro vaši kavárnu
          </p>
        </div>

        {/* Role Selection Cards - Variant B: Equal Weight */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Customer Card */}
          <Card 
            className="group bg-white/80 dark:bg-amber-800/30 border-2 border-amber-300 dark:border-amber-600 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-150 cursor-pointer hover:scale-[1.02] focus-within:ring-4 focus-within:ring-amber-500/20"
            role="button"
            tabIndex={0}
            aria-pressed={selectedRole === 'customer'}
            onClick={() => handleRoleSelect("/auth/customer", "customer")}
            onKeyDown={(e) => handleKeyPress(e, "/auth/customer", "customer")}
          >
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center h-full">
                <div className="w-20 h-20 bg-amber-500 dark:bg-amber-600 rounded-3xl mb-6 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-150">
                  <Users className="text-white" size={28} />
                </div>
                <h2 className="text-2xl font-bold text-amber-900 dark:text-amber-100 mb-4">Zákazník</h2>
                <p className="text-base text-amber-800 dark:text-amber-200 font-medium mb-6 leading-relaxed min-h-[3rem] flex items-center justify-center">
                  Přístup k věrnostnímu účtu, dobíjení peněženky a sledování odměn
                </p>

                <div className="space-y-4 mb-8 w-full flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-3 text-amber-800 dark:text-amber-200 text-sm">
                    <Gift size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span className="font-medium">Bonusové kredity při dobití</span>
                  </div>
                  <div className="flex items-center gap-3 text-amber-800 dark:text-amber-200 text-sm">
                    <Smartphone size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span className="font-medium">Rychlé placení QR kódem</span>
                  </div>
                  <div className="flex items-center gap-3 text-amber-800 dark:text-amber-200 text-sm">
                    <BarChart3 size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span className="font-medium">Přehled všech nákupů</span>
                  </div>
                </div>

                <Button className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white font-semibold text-base shadow-lg transition-all duration-150 focus-visible:ring-4 focus-visible:ring-amber-500/20 mt-auto mx-auto">
                  Pokračovat jako zákazník
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Staff Card */}
          <Card 
            className="group bg-white/80 dark:bg-amber-900/30 border-2 border-amber-700 dark:border-amber-600 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-150 cursor-pointer hover:scale-[1.02] focus-within:ring-4 focus-within:ring-amber-700/20"
            role="button"
            tabIndex={0}
            aria-pressed={selectedRole === 'staff'}
            onClick={() => handleRoleSelect("/admin/login", "staff")}
            onKeyDown={(e) => handleKeyPress(e, "/admin/login", "staff")}
          >
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center h-full">
                <div className="w-20 h-20 bg-amber-700 dark:bg-amber-800 rounded-3xl mb-6 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-150">
                  <Store className="text-white" size={28} />
                </div>
                <h2 className="text-2xl font-bold text-amber-900 dark:text-amber-100 mb-4">Personál kavárny</h2>
                <p className="text-base text-amber-800 dark:text-amber-200 font-medium mb-6 leading-relaxed min-h-[3rem] flex items-center justify-center">
                  Příjem plateb, správa zákazníků a obchodní analytics
                </p>

                <div className="space-y-4 mb-8 w-full flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-3 text-amber-800 dark:text-amber-200 text-sm">
                    <CreditCard size={16} className="text-amber-700 dark:text-amber-500 flex-shrink-0" />
                    <span className="font-medium">Příjem plateb</span>
                  </div>
                  <div className="flex items-center gap-3 text-amber-800 dark:text-amber-200 text-sm">
                    <Users size={16} className="text-amber-700 dark:text-amber-500 flex-shrink-0" />
                    <span className="font-medium">Správa zákazníků</span>
                  </div>
                  <div className="flex items-center gap-3 text-amber-800 dark:text-amber-200 text-sm">
                    <BarChart3 size={16} className="text-amber-700 dark:text-amber-500 flex-shrink-0" />
                    <span className="font-medium">Obchodní analytics</span>
                  </div>
                </div>

                <Button className="w-full h-12 rounded-2xl bg-amber-700 hover:bg-amber-800 active:bg-amber-900 dark:bg-amber-800 dark:hover:bg-amber-900 text-white font-semibold text-base shadow-lg transition-all duration-150 focus-visible:ring-4 focus-visible:ring-amber-700/20 mt-auto mx-auto">
                  Přihlásit se jako personál
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-lg text-amber-800 dark:text-amber-200 font-medium">
            Bezpečná správa věrnostního programu pro vaši kavárnu
          </p>
        </div>
      </div>
    </div>
  );
}