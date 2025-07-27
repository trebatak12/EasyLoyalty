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
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <Coffee className="text-white" size={28} />
              </div>
              <h1 className="text-3xl font-bold text-amber-900 mb-2">
                {activeTab === "signin" ? "Welcome Back" : "Join EasyLoyalty"}
              </h1>
              <p className="text-lg text-amber-800 font-medium">
                {activeTab === "signin" ? "Sign in to your loyalty account" : "Create your account and start earning"}
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
              <TabsList className="grid w-full grid-cols-2 bg-amber-50 rounded-2xl p-1 border-2 border-amber-200">
                <TabsTrigger 
                  value="signin"
                  className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-400 data-[state=active]:to-orange-500 data-[state=active]:text-white font-semibold"
                >
                  Přihlášení
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-400 data-[state=active]:to-orange-500 data-[state=active]:text-white font-semibold"
                >
                  Registrace
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                <form onSubmit={handleSignIn} className="space-y-6">
                  <div>
                    <Label htmlFor="signin-email" className="text-base font-bold text-amber-900 mb-2 block">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="customer@test.com"
                        value={signInData.email}
                        onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signin-password" className="text-base font-bold text-amber-900 mb-2 block">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="customer123"
                        value={signInData.password}
                        onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold text-lg shadow-lg transition-all duration-200"
                  >
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignUp} className="space-y-6">
                  <div>
                    <Label htmlFor="signup-name" className="text-base font-bold text-amber-900 mb-2 block">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Your full name"
                        value={signUpData.name}
                        onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signup-email" className="text-base font-bold text-amber-900 mb-2 block">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={signUpData.email}
                        onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signup-password" className="text-base font-bold text-amber-900 mb-2 block">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a strong password"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:bg-green-700 text-white font-bold text-lg shadow-lg transition-all duration-200"
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

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
```

```
Refactoring customer-auth.tsx to use customer-specific colors (orange/yellow) and translations.
```

```typescript
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
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <Coffee className="text-white" size={28} />
              </div>
              <h1 className="text-3xl font-bold text-amber-900 mb-2">Zákaznický přístup</h1>
              <p className="text-lg text-amber-800 font-medium">Přístup k věrnostnímu účtu, dobíjení peněženky a sledování odměn</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
              <TabsList className="grid w-full grid-cols-2 bg-amber-50 rounded-2xl p-1 border-2 border-amber-200">
                <TabsTrigger
                  value="signin"
                  className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-400 data-[state=active]:to-orange-500 data-[state=active]:text-white font-semibold"
                >
                  Přihlášení
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-400 data-[state=active]:to-orange-500 data-[state=active]:text-white font-semibold"
                >
                  Registrace
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                <form onSubmit={handleSignIn} className="space-y-6">
                  <div>
                    <Label htmlFor="signin-email" className="text-base font-bold text-amber-900 mb-2 block">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="customer@test.com"
                        value={signInData.email}
                        onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signin-password" className="text-base font-bold text-amber-900 mb-2 block">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="customer123"
                        value={signInData.password}
                        onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:bg-green-700 text-white font-bold text-lg shadow-lg transition-all duration-200"
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignUp} className="space-y-6">
                  <div>
                    <Label htmlFor="signup-name" className="text-base font-bold text-amber-900 mb-2 block">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Your full name"
                        value={signUpData.name}
                        onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signup-email" className="text-base font-bold text-amber-900 mb-2 block">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={signUpData.email}
                        onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signup-password" className="text-base font-bold text-amber-900 mb-2 block">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a strong password"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:bg-green-700 text-white font-bold text-lg shadow-lg transition-all duration-200"
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

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
```

```
Refactor: Updated UI elements with customer-specific branding (colors, translations) in customer-auth.tsx.
```

```typescript
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
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <Coffee className="text-white" size={28} />
              </div>
              <h1 className="text-3xl font-bold text-amber-900 mb-2">Zákaznický přístup</h1>
              <p className="text-lg text-amber-800 font-medium">Přístup k věrnostnímu účtu, dobíjení peněženky a sledování odměn</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
              <TabsList className="grid w-full grid-cols-2 bg-amber-50 rounded-2xl p-1 border-2 border-amber-200">
                <TabsTrigger
                  value="signin"
                  className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-400 data-[state=active]:to-orange-500 data-[state=active]:text-white font-semibold"
                >
                  Přihlášení
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-400 data-[state=active]:to-orange-500 data-[state=active]:text-white font-semibold"
                >
                  Registrace
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                <form onSubmit={handleSignIn} className="space-y-6">
                  <div>
                    <Label htmlFor="signin-email" className="text-base font-bold text-amber-900 mb-2 block">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="customer@test.com"
                        value={signInData.email}
                        onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signin-password" className="text-base font-bold text-amber-900 mb-2 block">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="customer123"
                        value={signInData.password}
                        onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:bg-green-700 text-white font-bold text-lg shadow-lg transition-all duration-200"
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignUp} className="space-y-6">
                  <div>
                    <Label htmlFor="signup-name" className="text-base font-bold text-amber-900 mb-2 block">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Your full name"
                        value={signUpData.name}
                        onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signup-email" className="text-base font-bold text-amber-900 mb-2 block">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={signUpData.email}
                        onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signup-password" className="text-base font-bold text-amber-900 mb-2 block">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a strong password"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:bg-green-700 text-white font-bold text-lg shadow-lg transition-all duration-200"
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Test Credentials */}
            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-2xl">
              <p className="text-sm font-bold text-gray-900 text-center mb-2">Test Credentials</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-bold text-gray-900">Email:</p>
                  <p```
Update signin form labels and placeholders
```

```typescript
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
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <Coffee className="text-white" size={28} />
              </div>
              <h1 className="text-3xl font-bold text-amber-900 mb-2">Zákaznický přístup</h1>
              <p className="text-lg text-amber-800 font-medium">Přístup k věrnostnímu účtu, dobíjení peněženky a sledování odměn</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
              <TabsList className="grid w-full grid-cols-2 bg-amber-50 rounded-2xl p-1 border-2 border-amber-200">
                <TabsTrigger
                  value="signin"
                  className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-400 data-[state=active]:to-orange-500 data-[state=active]:text-white font-semibold"
                >
                  Přihlášení
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-400 data-[state=active]:to-orange-500 data-[state=active]:text-white font-semibold"
                >
                  Registrace
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                <form onSubmit={handleSignIn} className="space-y-6">
                  <div>
                    <Label htmlFor="signin-email" className="text-base font-bold text-amber-900 mb-2 block">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="customer@test.com"
                        value={signInData.email}
                        onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signin-password" className="text-base font-bold text-amber-900 mb-2 block">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="customer123"
                        value={signInData.password}
                        onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:bg-green-700 text-white font-bold text-lg shadow-lg transition-all duration-200"
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignUp} className="space-y-6">
                  <div>
                    <Label htmlFor="signup-name" className="text-base font-bold text-amber-900 mb-2 block">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Your full name"
                        value={signUpData.name}
                        onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signup-email" className="text-base font-bold text-amber-900 mb-2 block">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={signUpData.email}
                        onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signup-password" className="text-base font-bold text-amber-900 mb-2 block">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a strong password"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:bg-green-700 text-white font-bold text-lg shadow-lg transition-all duration-200"
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

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
```

```
Update signup form styling
```

```typescript
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
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <Coffee className="text-white" size={28} />
              </div>
              <h1 className="text-3xl font-bold text-amber-900 mb-2">Zákaznický přístup</h1>
              <p className="text-lg text-amber-800 font-medium">Přístup k věrnostnímu účtu, dobíjení peněženky a sledování odměn</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
              <TabsList className="grid w-full grid-cols-2 bg-amber-50 rounded-2xl p-1 border-2 border-amber-200">
                <TabsTrigger
                  value="signin"
                  className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-400 data-[state=active]:to-orange-500 data-[state=active]:text-white font-semibold"
                >
                  Přihlášení
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-400 data-[state=active]:to-orange-500 data-[state=active]:text-white font-semibold"
                >
                  Registrace
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                <form onSubmit={handleSignIn} className="space-y-6">
                  <div>
                    <Label htmlFor="signin-email" className="text-base font-bold text-amber-900 mb-2 block">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="customer@test.com"
                        value={signInData.email}
                        onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signin-password" className="text-base font-bold text-amber-900 mb-2 block">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="customer123"
                        value={signInData.password}
                        onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:bg-green-700 text-white font-bold text-lg shadow-lg transition-all duration-200"
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignUp} className="space-y-6">
                  <div>
                    <Label htmlFor="signup-name" className="text-base font-bold text-amber-900 mb-2 block">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Your full name"
                        value={signUpData.name}
                        onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signup-email" className="text-base font-bold text-amber-900 mb-2 block">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={signUpData.email}
                        onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signup-password" className="text-base font-bold text-amber-900 mb-2 block">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={18} />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a strong password"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        className="pl-12 h-12 rounded-2xl border-2 border-amber-300 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-gray-900 font-medium transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:bg-green-700 text-white font-bold text-lg shadow-lg transition-all duration-200"
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

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
`