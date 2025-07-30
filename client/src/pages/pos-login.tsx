import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Coffee, Lock, User } from "lucide-react";

export default function POSLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await fetch("/api/pos/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: "include", // Important for cookies
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Chyba přihlášení");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Přihlášení úspěšné",
        description: `Vítejte v pokladním systému, ${data.admin.name}`,
      });
      setLocation("/pos/charge");
    },
    onError: (error: any) => {
      toast({
        title: "Chyba přihlášení",
        description: error.message || "Nesprávné přihlašovací údaje",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast({
        title: "Chyba",
        description: "Prosím vyplňte všechna pole",
        variant: "destructive"
      });
      return;
    }
    loginMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-2 border-amber-200 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center">
              <Coffee className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-amber-900">
              EasyLoyalty POS
            </CardTitle>
            <CardDescription className="text-amber-700">
              Přihlaste se do pokladního systému
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-amber-800 font-medium">
                  Email
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-amber-600" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10 border-amber-200 focus:border-amber-500 focus:ring-amber-500"
                    placeholder="admin@cafe.com"
                    disabled={loginMutation.isPending}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-amber-800 font-medium">
                  Heslo
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-amber-600" />
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10 border-amber-200 focus:border-amber-500 focus:ring-amber-500"
                    placeholder="••••••••"
                    disabled={loginMutation.isPending}
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 font-semibold"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Přihlašování..." : "Přihlásit se"}
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