
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coffee, LogOut, Users, Wallet, Gift, TrendingUp, Store } from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface DashboardData {
  totalCustomers: number;
  totalBalance: number;
  totalTransactions: number;
  monthlyStats: {
    newCustomers: number;
    totalSpent: number;
    transactions: number;
  };
}

// API helper function
async function apiRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

function StatCard({ title, value, icon: Icon, trend }: {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  trend?: string;
}) {
  return (
    <Card className="bg-white border-2 border-amber-200 rounded-2xl shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-bold text-amber-900">{title}</CardTitle>
        <Icon className="h-4 w-4 text-amber-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-amber-900">{value}</div>
        {trend && (
          <p className="text-xs text-amber-700 font-medium">
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
      <p className="text-amber-700">Načítání...</p>
    </div>
  </div>
);

export default function AdminDashboard() {
  // Všechny hooks MUSÍ být na začátku komponenty a volány vždy
  const adminAuth = useAdminAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Safe destructuring with fallbacks
  const admin = adminAuth?.admin || null;
  const isLoading = adminAuth?.isLoading || false;
  const logout = adminAuth?.logout;

  const dashboardQuery = useQuery({
    queryKey: ["adminDashboard"],
    queryFn: async () => {
      const response = await apiRequest("/api/admin/dashboard");
      return response as DashboardData;
    },
    refetchInterval: 30000,
    enabled: !!admin,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/admin/logout", { method: "POST" });
    },
    onSuccess: () => {
      if (logout) {
        logout();
      }
      toast({
        title: "Odhlášení úspěšné",
        description: "Byli jste úspěšně odhlášeni"
      });
      setLocation("/admin/login");
    },
    onError: (error: any) => {
      console.error("Logout error:", error);
      if (logout) {
        logout();
      }
      setLocation("/admin/login");
    }
  });

  // Effect pro přesměrování neautentizovaných uživatelů
  useEffect(() => {
    if (!isLoading && !admin) {
      setLocation("/admin/login");
    }
  }, [admin, isLoading, setLocation]);

  // Handler pro odhlášení
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Po všech hooks můžeme dělat podmíněné renderování
  if (!adminAuth || isLoading) {
    return <LoadingSpinner />;
  }

  if (!admin) {
    return <LoadingSpinner />;
  }

  // Hlavní render dashboardu
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
              onClick={() => setLocation("/admin/customers")}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              <Users className="w-4 h-4 mr-2" />
              Členové
            </Button>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
              disabled={logoutMutation.isPending}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Odhlásit
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {dashboardQuery.isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
            <p className="text-amber-700">Načítám data...</p>
          </div>
        ) : dashboardQuery.error ? (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-800 font-semibold">Chyba při načítání dat dashboardu</p>
            <Button 
              onClick={() => dashboardQuery.refetch()}
              className="mt-4 bg-red-600 hover:bg-red-700"
            >
              Zkusit znovu
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Celkový počet zákazníků"
                value={dashboardQuery.data?.totalCustomers || 0}
                icon={Users}
                trend="Aktivní členové"
              />
              <StatCard
                title="Celkový zůstatek"
                value={`${dashboardQuery.data?.totalBalance || 0} Kč`}
                icon={Wallet}
                trend="Na všech účtech"
              />
              <StatCard
                title="Počet transakcí"
                value={dashboardQuery.data?.totalTransactions || 0}
                icon={TrendingUp}
                trend="Celkem provedeno"
              />
              <StatCard
                title="Tento měsíc"
                value={`${dashboardQuery.data?.monthlyStats?.totalSpent || 0} Kč`}
                icon={Gift}
                trend={`${dashboardQuery.data?.monthlyStats?.transactions || 0} transakcí`}
              />
            </div>

            {/* Quick Actions */}
            <Card className="bg-white border-2 border-amber-200 rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-amber-900">Rychlé akce</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={() => setLocation("/admin/customers")}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-12"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Spravovat zákazníky
                  </Button>
                  <Button
                    onClick={() => setLocation("/admin/summaries")}
                    className="bg-green-600 hover:bg-green-700 text-white rounded-2xl h-12"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Zobrazit statistiky
                  </Button>
                  <Button
                    onClick={() => setLocation("/pos/charge")}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-2xl h-12"
                  >
                    <Store className="w-4 h-4 mr-2" />
                    POS systém
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Welcome Message */}
            {dashboardQuery.data && (
              <Card className="bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-200 rounded-2xl shadow-lg">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-amber-900 mb-2">
                      Vítejte zpět, {admin.name}!
                    </h2>
                    <p className="text-amber-800">
                      Máte {dashboardQuery.data.totalCustomers} aktivních zákazníků s celkovým zůstatkem {dashboardQuery.data.totalBalance} Kč
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
