import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, ArrowLeft, Mail, Lock, Coffee, CreditCard, Users, BarChart3, EyeOff, Eye, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useToast } from "@/hooks/use-toast";

export default function AdminAuth() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null); // State for error messages

  const [, setLocation] = useLocation();
  const adminAuth = useAdminAuth();
  const { toast } = useToast();
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  const login = adminAuth?.login;
  const isLoading = adminAuth?.isLoading || false;
  const isAuthenticated = adminAuth?.isAuthenticated || false;

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/admin/dashboard");
    }
  }, [isAuthenticated, setLocation]);

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
      setError(null); // Clear any previous errors
    } catch (error: any) {
      console.error("Admin login error:", error);
      setError(error.message || "Nesprávné přihlašovací údaje"); // Set error message
      toast({
        title: "Přihlášení se nezdařilo",
        description: error.message || "Nesprávné přihlašovací údaje",
        variant: "destructive"
      });
    }
  };

  const LoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        <p className="mt-2 text-stone-700">Načítání...</p>
      </div>
    </div>
  );

  if (!adminAuth || isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <LoadingSpinner />;
  }

  // Mock handleSubmit and related states for the provided changes to work
  const handleSubmit = handleLogin;
  const email = loginData.email;
  const password = loginData.password;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          variant="outline"
          onClick={() => setLocation("/")}
          className="mb-6 border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold flex items-center gap-2 rounded-xl"
        >
          <ArrowLeft size={18} />
          Back to Mode Selection
        </Button>

        <Card className="bg-white border-0 rounded-3xl shadow-xl">
          <CardContent className="pt-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-amber-700 to-amber-800 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <Store className="text-white" size={28} />
              </div>
              <h1 className="text-3xl font-bold text-amber-900 mb-2">Personál kavárny</h1>
              <p className="text-lg text-amber-700 font-medium">
                Příjem plateb, správa zákazníků a obchodní analytics
              </p>
            </div></CardContent></div>



            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-amber-800 mb-2">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-700" size={18} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@cafe.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="pl-12 h-12 rounded-xl border border-amber-200 bg-amber-50/30 focus:border-amber-600 focus:ring-2 focus:ring-amber-200 text-amber-900 font-medium transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="block text-sm font-medium text-amber-800 mb-2">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-700" size={18} />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="pl-12 h-12 rounded-xl border border-amber-200 bg-amber-50/30 focus:border-amber-600 focus:ring-2 focus:ring-amber-200 text-amber-900 font-medium transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-amber-700 hover:text-amber-800 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-red-800 text-sm bg-red-50 border border-red-200 rounded-2xl p-4">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-14 rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white font-bold text-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || !loginData.email || !loginData.password}
              >
                {isLoading ? "Přihlašování..." : "Přihlásit se jako personál"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-amber-700">
                Přístup pouze pro zaměstnance kavárny
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}