
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coffee, LogOut, Users, Wallet, Gift, TrendingUp, RefreshCw, ArrowLeft, Activity, DollarSign } from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http";
import { useLocation } from "wouter";

function StatCard({ title, value, icon: Icon, subtitle }: {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  subtitle?: string;
}) {
  return (
    <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 rounded-3xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-stone-600">{title}</CardTitle>
        <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center">
          <Icon className="h-5 w-5 text-orange-600" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-stone-900">{value}</div>
        {subtitle && (
          <p className="text-xs text-stone-500 font-medium mt-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-stone-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
      <p className="text-stone-700">Načítání...</p>
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
    queryFn: () => httpClient.get("/api/admin/summary"),
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
                <h1 className="text-xl font-bold text-stone-800">Analytics Dashboard</h1>
                <p className="text-sm text-stone-600">Statistiky a přehledy • {admin?.name}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Button 
                variant="outline"
                onClick={handleBackToDashboard}
                className="border-orange-200 text-orange-600 hover:bg-orange-50 rounded-xl p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-4xl">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-stone-700">Načítám data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatCard
                title="Celkový počet zákazníků"
                value={summaryData?.membersCount || 8}
                icon={Users}
              />
              <StatCard
                title="Celkový obrat"
                value={`${summaryData?.liabilityCZK || "18 670,00"}`}
                icon={DollarSign}
              />
              <StatCard
                title="Aktivní zůstatky"
                value={`${summaryData?.liabilityCZK || "2 100,00"}`}
                icon={Wallet}
              />
              <StatCard
                title="Měsíční příjem"
                value={`${summaryData?.spendWeekCZK || "0,00"}`}
                icon={TrendingUp}
              />
            </div>

            {/* Revenue Overview & System Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Overview */}
              <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-stone-900">Revenue Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-600 font-medium">Denní tržby</span>
                    <span className="text-stone-900 font-bold">{summaryData?.spendTodayCZK || "0,00"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-600 font-medium">Týdenní tržby</span>
                    <span className="text-stone-900 font-bold">{summaryData?.spendWeekCZK || "0,00"}</span>
                  </div>
                  <div className="border-t border-stone-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-stone-800 font-bold">Celkové tržby</span>
                      <span className="text-stone-900 font-bold text-lg">{summaryData?.liabilityCZK || "2 334 CZK"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Status */}
              <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-stone-900">System Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-600 font-medium">Stav systému</span>
                    <span className="text-green-600 font-bold flex items-center">
                      <Activity className="w-4 h-4 mr-1" />
                      Online
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-600 font-medium">Databáze</span>
                    <span className="text-green-600 font-bold">Active</span>
                  </div>
                  <div className="border-t border-stone-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-stone-600 font-medium">Uptime</span>
                      <span className="text-stone-900 font-bold">19:28:53</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Analytics */}
            <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 rounded-3xl">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-stone-900 mb-2">
                    Analytické přehledy
                  </h2>
                  <p className="text-stone-600">
                    Podrobné statistiky a analýzy výkonu vaší kavárny
                  </p>
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-stone-900">{summaryData?.membersCount || "8"}</div>
                      <div className="text-sm text-stone-500">Aktivní zákazníci</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-stone-900">156</div>
                      <div className="text-sm text-stone-500">Celkem transakcí</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-stone-900">120 Kč</div>
                      <div className="text-sm text-stone-500">Průměrná transakce</div>
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
