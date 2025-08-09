
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, ArrowLeft, Mail, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useToast } from "@/hooks/use-toast";

export default function AdminAuth() {
  // Všechny hooks na začátku komponenty
  const [, setLocation] = useLocation();
  const adminAuth = useAdminAuth();
  const { toast } = useToast();
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  // Destructure z adminAuth (může být undefined)
  const login = adminAuth?.login;
  const isLoading = adminAuth?.isLoading || false;
  const isAuthenticated = adminAuth?.isAuthenticated || false;

  // Effect pro přesměrování po přihlášení
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/admin/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  // Handler pro přihlášení
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading || !login) {
      return;
    }

    console.log("Admin login form submitted with data:", loginData);

    try {
      await login(loginData.email, loginData.password);
      console.log("Admin login successful, redirecting to dashboard");
    } catch (error: any) {
      console.error("Admin login error:", error);
      toast({
        title: "Přihlášení se nezdařilo",
        description: error.message || "Nesprávné přihlašovací údaje",
        variant: "destructive"
      });
    }
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        <p className="mt-2 text-amber-700">Načítání...</p>
      </div>
    </div>
  );

  // Podmíněné renderování bez early returns
  if (!adminAuth || isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <LoadingSpinner />; // Zobrazí loading během přesměrování
  }

  // Hlavní render formu
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => setLocation("/")}
          className="mb-6 text-amber-700 border-amber-300 hover:bg-amber-50 font-semibold flex items-center gap-2 rounded-2xl"
        >
          <ArrowLeft size={18} />
          Back to Mode Selection
        </Button>

        <Card className="bg-white border-2 border-amber-200 rounded-3xl shadow-xl">
          <CardContent className="pt-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-600 to-orange-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <Store className="text-white" size={28} />
              </div>
              <h1 className="text-3xl font-bold text-amber-900 mb-2">Personál kavárny</h1>
              <p className="text-lg text-amber-700 font-medium">
                Příjem plateb, správa zákazníků a obchodní analytics
              </p>
            </div>

            <div className="space-y-6 mb-8">
              <div className="flex items-center gap-3 text-amber-800">
                <div className="w-6 h-6 bg-amber-200 rounded-lg flex items-center justify-center">
                  <Store className="w-4 h-4 text-amber-700" />
                </div>
                <span className="font-medium">Příjem plateb</span>
              </div>
              <div className="flex items-center gap-3 text-amber-800">
                <div className="w-6 h-6 bg-amber-200 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4 text-amber-700" />
                </div>
                <span className="font-medium">Správa zákazníků</span>
              </div>
              <div className="flex items-center gap-3 text-amber-800">
                <div className="w-6 h-6 bg-amber-200 rounded-lg flex items-center justify-center">
                  <Lock className="w-4 h-4 text-amber-700" />
                </div>
                <span className="font-medium">Obchodní analytics</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-base font-semibold text-amber-900 mb-2 block">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@cafe.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="pl-12 h-12 rounded-2xl border border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-amber-900 font-medium transition-colors"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="password" className="text-base font-semibold text-amber-900 mb-2 block">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="pl-12 h-12 rounded-2xl border border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-amber-900 font-medium transition-colors"
                    required
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || !loginData.email || !loginData.password}
              >
                {isLoading ? "Přihlašování..." : "Přihlásit se jako personál"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-amber-600">
              <p>Přístup pouze pro zaměstnance kavárny</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
