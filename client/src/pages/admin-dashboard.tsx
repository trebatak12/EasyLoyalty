
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coffee, LogOut, Users, Wallet, Gift, TrendingUp, Store, Plus, QrCode, History, CreditCard } from "lucide-react";
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

// Import API service with auth token support
import { api } from "@/services/api";

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
      <p className="text-orange-700">Načítání...</p>
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
      console.log("Fetching admin dashboard data...");
      const response = await api.get("/api/admin/dashboard");
      console.log("Dashboard data received:", response);
      return response as DashboardData;
    },
    refetchInterval: 30000,
    enabled: !!admin,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post("/api/admin/logout");
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
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Coffee className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-stone-800">{admin.name}</h1>
                <p className="text-sm text-stone-600">{admin.email}</p>
              </div>
            </div>
            <Button 
              variant="outline"
              onClick={handleLogout}
              className="border-orange-200 text-orange-600 hover:bg-orange-50 rounded-xl px-4 py-2"
              disabled={logoutMutation.isPending}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-4xl">
        {dashboardQuery.isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-stone-700">Načítám data...</p>
          </div>
        ) : dashboardQuery.error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
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
            {/* Main Stats Card */}
            <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
              <div className="bg-gradient-to-r from-amber-700 to-amber-800 text-white p-6 sm:p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 text-amber-100 text-sm font-medium mb-2">
                      <Wallet className="w-4 h-4" />
                      ADMIN OVERVIEW
                    </div>
                    <div className="text-3xl sm:text-4xl font-bold mb-1">
                      {dashboardQuery.data?.totalCustomers || 0} Members
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-amber-100 text-sm font-medium mb-1">Total Balance</div>
                    <div className="text-xl sm:text-2xl font-bold">{dashboardQuery.data?.totalBalance || 0} Kč</div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-100 text-sm font-medium mb-1">Transactions</div>
                    <div className="text-xl sm:text-2xl font-bold">{dashboardQuery.data?.totalTransactions || 0}</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card 
                className="border-2 border-green-200 bg-green-50/50 hover:bg-green-50 transition-all duration-200 cursor-pointer rounded-3xl shadow-lg hover:shadow-xl group"
                onClick={() => setLocation("/admin/customers")}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-green-200 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-300 transition-colors">
                    <Users className="w-8 h-8 text-green-700" />
                  </div>
                  <h3 className="text-lg font-bold text-stone-800 mb-2">Manage Customers</h3>
                  <p className="text-stone-600 text-sm">View and manage all members</p>
                </CardContent>
              </Card>

              <Card 
                className="border-2 border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-all duration-200 cursor-pointer rounded-3xl shadow-lg hover:shadow-xl group"
                onClick={() => setLocation("/pos/charge")}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-300 transition-colors">
                    <Store className="w-8 h-8 text-blue-700" />
                  </div>
                  <h3 className="text-lg font-bold text-stone-800 mb-2">POS System</h3>
                  <p className="text-stone-600 text-sm">Process payments and charges</p>
                </CardContent>
              </Card>

              <Card 
                className="border-2 border-yellow-200 bg-yellow-50/50 hover:bg-yellow-50 transition-all duration-200 cursor-pointer rounded-3xl shadow-lg hover:shadow-xl group sm:col-span-2 lg:col-span-1"
                onClick={() => setLocation("/admin/summaries")}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-yellow-200 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-yellow-300 transition-colors">
                    <TrendingUp className="w-8 h-8 text-yellow-700" />
                  </div>
                  <h3 className="text-lg font-bold text-stone-800 mb-2">Statistics</h3>
                  <p className="text-stone-600 text-sm">View detailed analytics</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="border-0 shadow-lg rounded-3xl bg-gradient-to-br from-stone-50 to-stone-100">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold text-stone-800">Recent Activity</CardTitle>
                  <Button 
                    variant="outline"
                    className="border-orange-200 text-orange-600 hover:bg-orange-50 rounded-xl text-sm"
                    onClick={() => setLocation("/admin/summaries")}
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Monthly Stats */}
                  <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-stone-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <Plus className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-stone-800">New Members This Month</div>
                        <div className="text-sm text-stone-600">{dashboardQuery.data?.monthlyStats?.newCustomers || 0} new registrations</div>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-green-600">+{dashboardQuery.data?.monthlyStats?.newCustomers || 0}</div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-stone-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-stone-800">Monthly Revenue</div>
                        <div className="text-sm text-stone-600">{dashboardQuery.data?.monthlyStats?.transactions || 0} transactions</div>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-blue-600">{dashboardQuery.data?.monthlyStats?.totalSpent || 0} Kč</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
