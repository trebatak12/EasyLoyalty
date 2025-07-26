import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coffee, ArrowLeft } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-md">
        <Card className="card-easyloyalty">
          <CardContent className="pt-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-sage rounded-xl mx-auto mb-4 flex items-center justify-center">
                <Coffee className="text-white text-xl" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {activeTab === "signin" ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-muted-foreground">
                {activeTab === "signin" ? "Sign in to your loyalty account" : "Join the loyalty program"}
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-6">
                  <div>
                    <Label htmlFor="signin-email" className="block text-sm font-medium text-foreground mb-2">
                      Email
                    </Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="demo.customer@easyloyalty.dev"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      className="input-easyloyalty"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signin-password" className="block text-sm font-medium text-foreground mb-2">
                      Password
                    </Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      className="input-easyloyalty"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="btn-primary w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-6">
                  <div>
                    <Label htmlFor="signup-email" className="block text-sm font-medium text-foreground mb-2">
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      className="input-easyloyalty"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-name" className="block text-sm font-medium text-foreground mb-2">
                      Full Name
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signUpData.name}
                      onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                      className="input-easyloyalty"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-password" className="block text-sm font-medium text-foreground mb-2">
                      Password
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      className="input-easyloyalty"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="btn-primary w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/")}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to mode selection
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
