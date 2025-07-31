
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, ArrowLeft } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-white text-high-contrast">
      <div className="container mx-auto px-4 py-16 max-w-md">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => setLocation("/")}
          className="mb-6 text-blue-600 border-blue-300 hover:bg-blue-50 font-semibold flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Back to Mode Selection
        </Button>

        <Card className="bg-white border-2 border-blue-300 rounded-3xl shadow-strong">
          <CardContent className="pt-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <Store className="text-white" size={28} />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Café Staff Login</h1>
              <p className="text-lg text-gray-700 font-medium">Access payment and customer management</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-base font-bold text-gray-900 mb-2 block">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@cafe.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="h-12 rounded-2xl border-2 border-blue-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium transition-colors"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-base font-bold text-gray-900 mb-2 block">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="h-12 rounded-2xl border-2 border-blue-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium transition-colors"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || !loginData.email || !loginData.password}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
