import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coffee, Users, CreditCard, TrendingUp, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useToast } from "@/hooks/use-toast";

// API helper function
async function apiRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const error = new Error(`HTTP ${response.status}`);
    (error as any).response = {
      status: response.status,
      statusText: response.statusText,
      data: errorData,
    };
    throw error;
  }

  return response.json();
}

interface DashboardData {
  stats: {
    totalCustomers: number;
    totalTransactions: number;
    totalRevenue: number;
    averageTransaction: number;
  };
  recentTransactions: Array<{
    id: string;
    customerName: string;
    amount: number;
    type: string;
    createdAt: string;
  }>;
  topCustomers: Array<{
    id: string;
    name: string;
    email: string;
    totalSpent: number;
    balance: number;
  }>;
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

export default function AdminDashboard() {
  // Všechny hooks na začátku komponenty
  const { admin, isLoading, logout } = useAdminAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const dashboardQuery = useQuery({
    queryKey: ["adminDashboard"],
    queryFn: async () => {
      const response = await apiRequest("/api/admin/dashboard");
      return response as DashboardData;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!admin, // Only run query if admin is logged in
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/admin/logout", { method: "POST" });
    },
    onSuccess: () => {
      logout();
      toast({
        title: "Odhlášení úspěšné",
        description: "Byli jste úspěšně odhlášeni"
      });
      setLocation("/admin/login");
    },
    onError: (error: any) => {
      console.error("Logout error:", error);
      // Force logout even if API call fails
      logout();
      setLocation("/admin/login");
    }
  });

  // Handler pro odhlášení
  const handleLogout = async () => {
    logoutMutation.mutate();
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Načítání...</p>
      </div>
    </div>
  );

  // Podmíněné renderování bez early returns
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!admin) {
    setLocation("/admin/login");
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
          <LoadingSpinner />
        ) : dashboardQuery.error ? (
          <div className="text-center py-12">
            <p className="text-red-600 font-medium">Chyba při načítání dat dashboardu</p>
            <Button 
              onClick={() => dashboardQuery.refetch()}
              className="mt-4"
              variant="outline"
            >
              Zkusit znovu
            </Button>
          </div>
        ) : dashboardQuery.data ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Celkem členů"
                value={dashboardQuery.data.stats.totalCustomers}
                icon={Users}
                trend="aktivních účtů"
              />
              <StatCard
                title="Celkem transakcí"
                value={dashboardQuery.data.stats.totalTransactions}
                icon={CreditCard}
                trend="za všechny časy"
              />
              <StatCard
                title="Celkové tržby"
                value={`${dashboardQuery.data.stats.totalRevenue.toLocaleString('cs-CZ')} Kč`}
                icon={TrendingUp}
                trend="od spuštění systému"
              />
              <StatCard
                title="Průměrná transakce"
                value={`${dashboardQuery.data.stats.averageTransaction.toLocaleString('cs-CZ')} Kč`}
                icon={Coffee}
                trend="na jednu objednávku"
              />
            </div>

            {/* Recent Transactions & Top Customers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Transactions */}
              <Card className="bg-white border-2 border-amber-200 rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-amber-900">Poslední transakce</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardQuery.data.recentTransactions.length > 0 ? 
                      dashboardQuery.data.recentTransactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                          <div>
                            <p className="font-medium text-amber-900">{transaction.customerName}</p>
                            <p className="text-sm text-amber-700">
                              {new Date(transaction.createdAt).toLocaleString('cs-CZ')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${transaction.type === 'charge' ? 'text-red-600' : 'text-green-600'}`}>
                              {transaction.type === 'charge' ? '-' : '+'}{transaction.amount.toLocaleString('cs-CZ')} Kč
                            </p>
                            <p className="text-xs text-amber-600 capitalize">{transaction.type}</p>
                          </div>
                        </div>
                      )) :
                      <p className="text-amber-700 text-center py-4">Žádné transakce</p>
                    }
                  </div>
                </CardContent>
              </Card>

              {/* Top Customers */}
              <Card className="bg-white border-2 border-amber-200 rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-amber-900">Nejlepší zákazníci</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardQuery.data.topCustomers.length > 0 ?
                      dashboardQuery.data.topCustomers.map((customer, index) => (
                        <div key={customer.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-amber-900">{customer.name}</p>
                              <p className="text-sm text-amber-700">{customer.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-amber-900">{customer.totalSpent.toLocaleString('cs-CZ')} Kč</p>
                            <p className="text-xs text-amber-600">utraceno celkem</p>
                          </div>
                        </div>
                      )) :
                      <p className="text-amber-700 text-center py-4">Žádní zákazníci</p>
                    }
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-amber-700">Načítání dat...</p>
          </div>
        )}
      </div>
    </div>
  );
}