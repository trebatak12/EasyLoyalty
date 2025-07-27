import { useState, useEffect, useCallback } from "react";
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
  const { login, signup, googleAuth, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("signin");
  const [googleLoaded, setGoogleLoaded] = useState(false);

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

  // Load Google Identity Services
  useEffect(() => {
    const loadGoogleScript = () => {
      if (document.getElementById('google-identity')) {
        setGoogleLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-identity';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => setGoogleLoaded(true);
      document.head.appendChild(script);
    };

    loadGoogleScript();
  }, []);

  const handleGoogleSignIn = useCallback(async (credentialResponse: { credential: string }) => {
    try {
      await googleAuth(credentialResponse.credential);
      setLocation("/home");
    } catch (error: any) {
      toast({
        title: "Google Sign In Failed",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive"
      });
    }
  }, [googleAuth, setLocation, toast]);

  // Initialize Google Sign-In when loaded
  useEffect(() => {
    if (googleLoaded && window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
        callback: handleGoogleSignIn,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
    }
  }, [googleLoaded, handleGoogleSignIn]);

  const triggerGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-white flex items-center justify-center p-4 text-high-contrast">
      <div className="w-full max-w-md">
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
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <Coffee className="text-white" size={28} />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {activeTab === "signin" ? "Welcome Back" : "Join EasyLoyalty"}
              </h1>
              <p className="text-lg text-gray-700 font-medium">
                {activeTab === "signin" ? "Sign in to your loyalty account" : "Create your account and start earning"}
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
              <TabsList className="grid w-full grid-cols-2 bg-blue-100 rounded-2xl p-1 border-2 border-blue-200">
                <TabsTrigger 
                  value="signin"
                  className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-700 font-semibold"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-700 font-semibold"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                <form onSubmit={handleSignIn} className="space-y-6">
                  <div>
                    <Label htmlFor="signin-email" className="text-base font-bold text-gray-900 mb-2 block">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-600" size={18} />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="customer@test.com"
                        value={signInData.email}
                        onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-blue-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="signin-password" className="text-base font-bold text-gray-900 mb-2 block">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-600" size={18} />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="customer123"
                        value={signInData.password}
                        onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-blue-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-lg transition-all duration-200"
                  >
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignUp} className="space-y-6">
                  <div>
                    <Label htmlFor="signup-name" className="text-base font-bold text-gray-900 mb-2 block">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-green-600" size={18} />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Your full name"
                        value={signUpData.name}
                        onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-green-300 bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signup-email" className="text-base font-bold text-gray-900 mb-2 block">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-green-600" size={18} />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={signUpData.email}
                        onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-green-300 bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="signup-password" className="text-base font-bold text-gray-900 mb-2 block">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-green-600" size={18} />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a strong password"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-green-300 bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-lg transition-all duration-200"
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Google Sign In Section */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500 font-medium">Or continue with</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={triggerGoogleSignIn}
                disabled={!googleLoaded || isLoading}
                className="w-full mt-4 h-12 rounded-2xl border-2 border-gray-300 hover:bg-gray-50 font-bold text-lg"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
            </div>

            {/* Test Credentials */}
            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-2xl">
              <p className="text-sm font-bold text-gray-900 text-center mb-2">Test Credentials</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-bold text-gray-900">Email:</p>
                  <p className="text-gray-700 font-medium">customer@test.com</p>
                </div>
                <div>
                  <p className="font-bold text-gray-900">Password:</p>
                  <p className="text-gray-700 font-medium">customer123</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}