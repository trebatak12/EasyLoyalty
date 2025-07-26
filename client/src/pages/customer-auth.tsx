import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coffee, ArrowLeft, Mail, Lock, User } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function CustomerAuth() {
  const [, setLocation] = useLocation();
  const { login, signup, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("signin");

  const [signInData, setSignInData] = useState({
    email: "",
    password: ""
  });

  const [signUpData, setSignUpData] = useState({
    email: "",
    name: "",
    password: ""
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(signInData.email, signInData.password);
      setLocation("/home");
    } catch (error: any) {
      toast({
        title: "Sign In Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive"
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signup(signUpData.email, signUpData.name, signUpData.password);
      setLocation("/home");
    } catch (error: any) {
      toast({
        title: "Sign Up Failed",
        description: error.message || "Failed to create account",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg via-surface to-card flex items-center justify-center p-4 text-high-contrast">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-6 text-muted-foreground hover:text-foreground flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Back to Mode Selection
        </Button>

        <Card className="bg-warm-white border border-warm rounded-3xl shadow-warm">
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <Coffee className="text-white" size={28} />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {activeTab === "signin" ? "Welcome Back" : "Join EasyLoyalty"}
              </h1>
              <p className="text-muted-foreground">
                {activeTab === "signin" ? "Sign in to your loyalty account" : "Create your account and start earning"}
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
              <TabsList className="grid w-full grid-cols-2 bg-surface/50 rounded-2xl p-1">
                <TabsTrigger 
                  value="signin"
                  className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                <form onSubmit={handleSignIn} className="space-y-6">
                  <div>
                    <Label htmlFor="signin-email" className="text-sm font-medium text-foreground mb-2 block">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="customer@test.com"
                        value={signInData.email}
                        onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-border/50 bg-surface/30 focus:bg-white transition-colors"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="signin-password" className="text-sm font-medium text-foreground mb-2 block">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="customer123"
                        value={signInData.password}
                        onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-border/50 bg-surface/30 focus:bg-white transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary-hover hover:to-primary-hover/90 text-white font-semibold shadow-lg transition-all duration-200"
                  >
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignUp} className="space-y-6">
                  <div>
                    <Label htmlFor="signup-name" className="text-sm font-medium text-foreground mb-2 block">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Your full name"
                        value={signUpData.name}
                        onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-border/50 bg-surface/30 focus:bg-white transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signup-email" className="text-sm font-medium text-foreground mb-2 block">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={signUpData.email}
                        onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-border/50 bg-surface/30 focus:bg-white transition-colors"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="signup-password" className="text-sm font-medium text-foreground mb-2 block">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a strong password"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-border/50 bg-surface/30 focus:bg-white transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary-hover hover:to-primary-hover/90 text-white font-semibold shadow-lg transition-all duration-200"
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Test Credentials */}
            <div className="mt-8 p-4 bg-surface/30 rounded-2xl">
              <p className="text-xs text-muted-foreground text-center mb-2">Test Credentials</p>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-medium text-foreground">Email:</p>
                  <p className="text-muted-foreground">customer@test.com</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Password:</p>
                  <p className="text-muted-foreground">customer123</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}