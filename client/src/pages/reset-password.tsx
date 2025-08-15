import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Shield } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Extract token from URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    
    if (tokenParam) {
      setToken(tokenParam);
      validateToken(tokenParam);
    } else {
      setIsValidatingToken(false);
      toast({
        title: "Neplatný odkaz",
        description: "Odkaz pro reset hesla je neplatný nebo poškozený.",
        variant: "destructive",
      });
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/home");
    }
  }, [isAuthenticated, setLocation]);

  const validateToken = async (tokenToValidate: string) => {
    try {
      const response = await api.get(`/api/auth/reset-password/validate?token=${encodeURIComponent(tokenToValidate)}`);
      
      if (response.valid) {
        setIsTokenValid(true);
      } else {
        setIsTokenValid(false);
        toast({
          title: "Neplatný token",
          description: response.error || "Token pro reset hesla je neplatný nebo vypršel.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Token validation error:", error);
      setIsTokenValid(false);
      toast({
        title: "Chyba ověření",
        description: "Nepodařilo se ověřit platnost tokenu.",
        variant: "destructive",
      });
    } finally {
      setIsValidatingToken(false);
    }
  };

  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (pwd.match(/[a-z]/) && pwd.match(/[A-Z]/)) strength += 25;
    if (pwd.match(/\d/)) strength += 25;
    if (pwd.match(/[^a-zA-Z\d]/)) strength += 25;
    return strength;
  };

  const getPasswordStrengthLabel = (strength: number) => {
    if (strength === 0) return "";
    if (strength <= 25) return "Slabé";
    if (strength <= 50) return "Střední";
    if (strength <= 75) return "Silné";
    return "Velmi silné";
  };

  const getPasswordStrengthColor = (strength: number) => {
    if (strength <= 25) return "bg-red-500";
    if (strength <= 50) return "bg-yellow-500";
    if (strength <= 75) return "bg-blue-500";
    return "bg-green-500";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;

    // Validation
    if (!password || !confirmPassword) {
      toast({
        title: "Chyba",
        description: "Vyplňte prosím všechna pole",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Chyba",
        description: "Hesla se neshodují",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Chyba",
        description: "Heslo musí mít alespoň 8 znaků",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post("/api/auth/reset-password", {
        token,
        newPassword: password,
      });

      setIsSuccess(true);
      
      toast({
        title: "Heslo úspěšně změněno",
        description: response.silentLogin ? "Byli jste automaticky přihlášeni." : "Nyní se můžete přihlásit s novým heslem.",
      });

      // If silent login, redirect to home after a short delay
      if (response.silentLogin) {
        setTimeout(() => {
          setLocation("/home");
        }, 2000);
      }
    } catch (error: any) {
      console.error("Reset password error:", error);
      
      toast({
        title: "Chyba při změně hesla",
        description: error.message || "Nastala chyba při změně hesla",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidatingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card className="bg-white/90 backdrop-blur-sm border border-amber-200 rounded-3xl shadow-xl">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg animate-pulse">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <p className="text-lg font-medium text-amber-900">Ověřování tokenu...</p>
                <p className="text-sm text-amber-700 mt-2">
                  Prosím čekejte, ověřujeme platnost odkazu pro reset hesla.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isTokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card className="bg-white/90 backdrop-blur-sm border border-amber-200 rounded-3xl shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl text-amber-900">Neplatný odkaz</CardTitle>
              <CardDescription className="text-amber-700">
                Odkaz pro reset hesla je neplatný, poškozený nebo vypršel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-700">
                  Možné příčiny:
                </p>
                <ul className="list-disc list-inside text-sm text-red-700 mt-2 space-y-1">
                  <li>Odkaz byl použit více než jednou</li>
                  <li>Odkaz je starší než 30 minut</li>
                  <li>Odkaz byl zkopírován neúplně</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Link href="/forgot-password">
                <Button className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-semibold text-lg shadow-lg transition-all duration-200" data-testid="button-request-new">
                  Požádat o nový odkaz
                </Button>
              </Link>
              <Link href="/auth/customer">
                <Button variant="outline" className="w-full text-amber-700 border-amber-300 hover:bg-amber-50 font-semibold" data-testid="link-back-login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Zpět na přihlášení
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card className="bg-white/90 backdrop-blur-sm border border-amber-200 rounded-3xl shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-xl text-amber-900">Heslo změněno</CardTitle>
              <CardDescription className="text-amber-700">
                Vaše heslo bylo úspěšně změněno. Nyní se můžete přihlásit s novým heslem.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link href="/auth/customer">
                <Button className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-semibold text-lg shadow-lg transition-all duration-200" data-testid="button-goto-login">
                  Přejít na přihlášení
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4">
      <div className="max-w-md mx-auto pt-20">
        <Card className="bg-white/90 backdrop-blur-sm border border-amber-200 rounded-3xl shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-xl text-amber-900">Nové heslo</CardTitle>
            <CardDescription className="text-amber-700">
              Zadejte nové bezpečné heslo pro svůj účet.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nové heslo</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Zadejte nové heslo"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {password && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Síla hesla:</span>
                      <span className={`font-medium ${passwordStrength <= 25 ? 'text-red-600' : passwordStrength <= 50 ? 'text-yellow-600' : passwordStrength <= 75 ? 'text-blue-600' : 'text-green-600'}`}>
                        {getPasswordStrengthLabel(passwordStrength)}
                      </span>
                    </div>
                    <Progress 
                      value={passwordStrength} 
                      className="h-2"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Potvrzení hesla</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Zadejte heslo znovu"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    data-testid="input-confirm-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    data-testid="button-toggle-confirm-password"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Hesla se neshodují
                  </p>
                )}
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  Požadavky na heslo:
                </p>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li className={`flex items-center ${password.length >= 8 ? 'text-green-600 dark:text-green-400' : ''}`}>
                    <span className="mr-2">{password.length >= 8 ? '✓' : '•'}</span>
                    Alespoň 8 znaků
                  </li>
                  <li className={`flex items-center ${password.match(/[a-z]/) && password.match(/[A-Z]/) ? 'text-green-600 dark:text-green-400' : ''}`}>
                    <span className="mr-2">{password.match(/[a-z]/) && password.match(/[A-Z]/) ? '✓' : '•'}</span>
                    Malá a velká písmena
                  </li>
                  <li className={`flex items-center ${password.match(/\d/) ? 'text-green-600 dark:text-green-400' : ''}`}>
                    <span className="mr-2">{password.match(/\d/) ? '✓' : '•'}</span>
                    Alespoň jedna číslice
                  </li>
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button 
                type="submit" 
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-semibold text-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={isLoading || password !== confirmPassword || password.length < 8}
                data-testid="button-reset-password"
              >
                {isLoading ? "Měním heslo..." : "Změnit heslo"}
              </Button>
              <Link href="/auth/customer">
                <Button variant="outline" className="w-full text-amber-700 border-amber-300 hover:bg-amber-50 font-semibold" data-testid="link-back-login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Zpět na přihlášení
                </Button>
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}