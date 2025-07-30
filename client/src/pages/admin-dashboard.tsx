import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  Calendar,
  Search,
  Filter,
  Coffee,
  LogOut
} from "lucide-react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Customer {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  wallet: {
    balanceCZK: string;
    balanceCents: number;
    bonusGrantedTotalCZK: string;
    bonusGrantedTotalCents: number;
  };
}

interface Summary {
  membersCount: number;
  liabilityCZK: string;
  liabilityCents: number;
  bonusGrantedTotalCZK: string;
  bonusGrantedTotalCents: number;
  spendTodayCZK: string;
  spendTodayCents: number;
  spendWeekCZK: string;
  spendWeekCents: number;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("summary");

  // Check admin authentication
  const { data: admin, error } = useQuery({
    queryKey: ["/api/admin/me"],
    retry: false
  });

  if (error && error.message.includes("401")) {
    setLocation("/admin/login");
    return null;
  }

  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ["/api/admin/customers"],
    enabled: activeTab === "members"
  });

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/admin/summary"],
    enabled: activeTab === "summary"
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/admin/logout", { method: "POST" });
    },
    onSuccess: () => {
      setLocation("/admin/login");
    }
  });

  const filteredCustomers = customersData?.customers?.filter((customer: Customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
          <p className="mt-2 text-amber-700">Načítání...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      {/* Header */}
      <div className="bg-white border-b-2 border-amber-200 p-4 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <Coffee className="w-8 h-8 text-amber-600" />
            <div>
              <h1 className="text-xl font-bold text-amber-900">EasyLoyalty Admin</h1>
              <p className="text-sm text-amber-700">Dashboard • {admin.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline"
              onClick={() => setLocation("/pos/login")}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              POS Pokladna
            </Button>
            <Button 
              variant="outline" 
              onClick={() => logoutMutation.mutate()}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Odhlásit
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white border-2 border-amber-200">
            <TabsTrigger 
              value="summary" 
              className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Přehled
            </TabsTrigger>
            <TabsTrigger 
              value="members"
              className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900"
            >
              <Users className="w-4 h-4 mr-2" />
              Členové
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            {summaryLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="border-2 border-amber-200">
                    <CardContent className="p-6">
                      <div className="animate-pulse">
                        <div className="h-4 bg-amber-200 rounded w-3/4 mb-2"></div>
                        <div className="h-8 bg-amber-200 rounded w-1/2"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : summaryData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-blue-800">
                      Počet členů
                    </CardTitle>
                    <Users className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-900">
                      {summaryData.membersCount}
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      Aktivních zákazníků
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-200 bg-green-50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-green-800">
                      Celkový kredit
                    </CardTitle>
                    <CreditCard className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-900">
                      {summaryData.liabilityCZK}
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      Závazky vůči zákazníkům
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-200 bg-purple-50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-purple-800">
                      Bonus celkem
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-900">
                      {summaryData.bonusGrantedTotalCZK}
                    </div>
                    <p className="text-xs text-purple-600 mt-1">
                      Udělené bonusy
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-orange-200 bg-orange-50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-orange-800">
                      Útrata (7 dní)
                    </CardTitle>
                    <Calendar className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-900">
                      {summaryData.spendWeekCZK}
                    </div>
                    <p className="text-xs text-orange-600 mt-1">
                      Dnes: {summaryData.spendTodayCZK}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="members" className="space-y-6">
            <Card className="border-2 border-amber-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-amber-900">Členové systému</CardTitle>
                    <CardDescription className="text-amber-700">
                      Správa zákazníků a jejich peněženek
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-amber-500" />
                      <Input
                        placeholder="Hledat podle jména nebo emailu..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64 border-amber-200 focus:border-amber-500 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {customersLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-amber-100 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredCustomers.length === 0 ? (
                      <div className="text-center py-8 text-amber-600">
                        {searchQuery ? "Nenalezeni žádní zákazníci" : "Žádní zákazníci"}
                      </div>
                    ) : (
                      filteredCustomers.map((customer: Customer) => (
                        <div 
                          key={customer.id}
                          className="flex items-center justify-between p-4 bg-white rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              <div>
                                <h3 className="text-sm font-medium text-amber-900 truncate">
                                  {customer.name}
                                </h3>
                                <p className="text-sm text-amber-600 truncate">
                                  {customer.email}
                                </p>
                              </div>
                              <Badge 
                                variant={customer.status === "active" ? "default" : "secondary"}
                                className={customer.status === "active" ? "bg-green-100 text-green-800" : ""}
                              >
                                {customer.status === "active" ? "Aktivní" : "Neaktivní"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-6 text-right">
                            <div>
                              <div className="text-sm font-medium text-amber-900">
                                {customer.wallet.balanceCZK}
                              </div>
                              <div className="text-xs text-amber-600">
                                Bonus: {customer.wallet.bonusGrantedTotalCZK}
                              </div>
                            </div>
                            <div className="text-xs text-amber-600">
                              {customer.lastLoginAt 
                                ? `Naposledy: ${new Date(customer.lastLoginAt).toLocaleDateString('cs-CZ')}`
                                : "Nikdy nepřihlášen"
                              }
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}