import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, AlertCircle, CheckCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { httpClient } from "@/lib/http";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    if (!email.trim()) {
      toast({
        title: "Chyba",
        description: "Zadejte prosím e-mailovou adresu",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await httpClient.post("/api/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });

      setIsSubmitted(true);
      
      toast({
        title: "E-mail odeslán",
        description: "Pokud existuje účet s touto adresou, obdržíte instrukce pro reset hesla.",
      });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      
      toast({
        title: "Chyba",
        description: error.message || "Nastala chyba při zpracování žádosti",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card className="bg-white/90 backdrop-blur-sm border border-amber-200 rounded-3xl shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl text-amber-900">E-mail odeslán</CardTitle>
              <CardDescription className="text-amber-700">
                Pokud existuje účet s adresou <strong>{email}</strong>, obdržíte instrukce pro reset hesla.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">
                      Důležité informace
                    </h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Odkaz pro reset je platný pouze 30 minut</li>
                        <li>Zkontrolujte složku se spamem</li>
                        <li>Můžete zavřít tuto stránku</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button 
                onClick={() => setLocation("/auth/customer")}
                variant="outline" 
                className="w-full text-amber-700 border-amber-300 hover:bg-amber-50 font-semibold"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zpět na přihlášení
              </Button>
              <Button 
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail("");
                }}
                variant="ghost" 
                className="w-full text-amber-600 hover:bg-amber-50 font-medium"
              >
                Odeslat znovu
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4">
      <div className="max-w-md mx-auto pt-20">
        <Card className="bg-white/90 backdrop-blur-sm border border-amber-200 rounded-3xl shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-xl text-amber-900">Zapomenuté heslo</CardTitle>
            <CardDescription className="text-amber-700">
              Zadejte svou e-mailovou adresu a pošleme vám odkaz pro reset hesla.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mailová adresa</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vas@email.cz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  data-testid="input-email"
                />
              </div>
              
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="ml-3">
                    <p className="text-sm text-amber-700">
                      Odkaz pro reset hesla bude platný pouze 30 minut.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button 
                type="submit" 
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-semibold text-lg shadow-lg transition-all duration-200" 
                disabled={isLoading}
                data-testid="button-send-reset"
              >
                {isLoading ? "Odesílání..." : "Odeslat odkaz pro reset"}
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