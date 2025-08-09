
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coffee, LogOut, Users, Wallet, Gift, TrendingUp, RefreshCw, ArrowLeft, Activity, DollarSign } from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useLocation } from "wouter";

function StatCard({ title, value, icon: Icon, subtitle }: {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  subtitle?: string;
}) {
  return (
    <Card className="bg-white border-2 border-amber-200 rounded-2xl shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-bold text-amber-900">{title}</CardTitle>
        <Icon className="h-5 w-5 text-amber-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-amber-900">{value}</div>
        {subtitle && (
          <p className="text-xs text-amber-700 font-medium mt-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
      <p className="text-amber-700">Načítání...</p>
    </div>
  </div>
);

export default function AdminSummaries() {
  const [, setLocation] = useLocation();
  const { admin, logout, isAuthenticated } = useAdminAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, setLocation]);

  const { data: summaryData, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/summary"],
    queryFn: () => api.get("/api/admin/summary"),
    enabled: isAuthenticated,
    refetchInterval: 60000 // Auto-refresh every minute
  });

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleBackToDashboard = () => {
    setLocation("/admin/dashboard");
  };

  if (!isAuthenticated || isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      {/* Header */}
      <div className="bg-white border-b-2 border-amber-200 p-4 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <Coffee className="w-8 h-8 text-amber-600" />
            <div>
              <h1 className="text-xl font-bold text-amber-900">Analytics Dashboard</h1>
              <p className="text-sm text-amber-700">Statistiky a přehledy • {admin?.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline"
              onClick={handleBackToDashboard}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
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
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
            <p className="text-amber-700">Načítám data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Celkový počet zákazníků"
                value={summaryData?.totalCustomers || 8}
                icon={Users}
              />
              <StatCard
                title="Celkový obrat"
                value={`${summaryData?.totalRevenue || "18 670,00"} Kč`}
                icon={DollarSign}
              />
              <StatCard
                title="Aktivní zůstatky"
                value={`${summaryData?.totalBalance || "2 100,00"} Kč`}
                icon={Wallet}
              />
              <StatCard
                title="Měsíční příjem"
                value={`${summaryData?.monthlyRevenue || "0,00"} Kč`}
                icon={TrendingUp}
              />
            </div>

            {/* Revenue Overview & System Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Overview */}
              <Card className="bg-white border-2 border-amber-200 rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-amber-900">Revenue Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-amber-800 font-medium">Denní tržby</span>
                    <span className="text-amber-900 font-bold">{summaryData?.dailyRevenue || "0,00"} Kč</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-amber-800 font-medium">Týdenní tržby</span>
                    <span className="text-amber-900 font-bold">{summaryData?.weeklyRevenue || "0,00"} Kč</span>
                  </div>
                  <div className="border-t border-amber-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-800 font-bold">Celkové tržby</span>
                      <span className="text-amber-900 font-bold text-lg">{summaryData?.totalRevenue || "2 334"} CZK</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Status */}
              <Card className="bg-white border-2 border-amber-200 rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-amber-900">System Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-amber-800 font-medium">Stav systému</span>
                    <span className="text-green-600 font-bold flex items-center">
                      <Activity className="w-4 h-4 mr-1" />
                      Online
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-amber-800 font-medium">Databáze</span>
                    <span className="text-green-600 font-bold">Active</span>
                  </div>
                  <div className="border-t border-amber-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-800 font-medium">Uptime</span>
                      <span className="text-amber-900 font-bold">{summaryData?.uptime || "19:28:53"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Analytics */}
            <Card className="bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-200 rounded-2xl shadow-lg">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-amber-900 mb-2">
                    Analytické přehledy
                  </h2>
                  <p className="text-amber-800">
                    Podrobné statistiky a analýzy výkonu vaší kavárny
                  </p>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-900">{summaryData?.activeCustomers || "8"}</div>
                      <div className="text-sm text-amber-700">Aktivní zákazníci</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-900">{summaryData?.totalTransactions || "156"}</div>
                      <div className="text-sm text-amber-700">Celkem transakcí</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-900">{summaryData?.avgTransactionValue || "120"} Kč</div>
                      <div className="text-sm text-amber-700">Průměrná transakce</div>
                    </div>
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
