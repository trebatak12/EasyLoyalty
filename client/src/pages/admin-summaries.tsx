import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, LogOut, Users, Wallet, Gift, TrendingUp, RefreshCw } from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useLocation } from "wouter";

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

  const stats = [
    {
      title: "Total Members",
      value: summaryData?.membersCount || 0,
      icon: Users,
      color: "bg-sage"
    },
    {
      title: "Total Liability",
      value: summaryData?.liabilityCZK || "0 CZK",
      icon: Wallet,
      color: "bg-primary"
    },
    {
      title: "Bonuses Granted",
      value: summaryData?.bonusGrantedTotalCZK || "0 CZK",
      icon: Gift,
      color: "bg-dusty"
    },
    {
      title: "Today's Revenue",
      value: summaryData?.spendTodayCZK || "0 CZK",
      icon: TrendingUp,
      color: "bg-sage"
    }
  ];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary-foreground/20 rounded-xl flex items-center justify-center mr-3">
                <Store className="text-primary-foreground" size={20} />
              </div>
              <div>
                <p className="font-medium">{admin?.name}</p>
                <p className="text-sm text-primary-foreground/80">{admin?.role}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-primary-foreground/80 hover:text-primary-foreground"
            >
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
          <Button 
            onClick={handleRefresh}
            variant="outline"
            disabled={isLoading}
            className="text-primary hover:text-primary-foreground hover:bg-primary"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="card-easyloyalty">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                    <stat.icon className="text-white" size={24} />
                  </div>
                </div>
                {isLoading ? (
                  <div>
                    <div className="h-8 w-24 bg-muted rounded animate-pulse mb-1" />
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-bold text-foreground currency-display">
                      {typeof stat.value === "string" ? stat.value : stat.value.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Metrics */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Revenue Overview */}
          <Card className="card-easyloyalty">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Revenue Overview</h3>
              {isLoading ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Today</span>
                    <span className="font-semibold text-foreground currency-display">
                      {summaryData?.spendTodayCZK || "0 CZK"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">This Week</span>
                    <span className="font-semibold text-foreground currency-display">
                      {summaryData?.spendWeekCZK || "0 CZK"}
                    </span>
                  </div>
                  <hr className="border-border my-3" />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Average per Customer</span>
                    <span className="font-semibold text-foreground currency-display">
                      {summaryData?.membersCount > 0 
                        ? Math.round((summaryData?.liabilityCents || 0) / summaryData.membersCount / 100).toLocaleString() + " CZK"
                        : "0 CZK"
                      }
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="card-easyloyalty">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">System Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Database</span>
                  <span className="inline-flex items-center text-sage">
                    <div className="w-2 h-2 bg-sage rounded-full mr-2" />
                    Online
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payment System</span>
                  <span className="inline-flex items-center text-sage">
                    <div className="w-2 h-2 bg-sage rounded-full mr-2" />
                    Active
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="text-foreground">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
