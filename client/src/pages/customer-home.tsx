import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coffee, Plus, QrCode, History, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { formatCurrency } from "@/utils/currency";

export default function CustomerHome() {
  const [, setLocation] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/auth/customer");
    }
  }, [isAuthenticated, setLocation]);

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["/api/me/wallet"],
    enabled: isAuthenticated
  });

  const { data: recentTransactions, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/me/history"],
    enabled: isAuthenticated
  });

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="header-blur border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-sage rounded-xl flex items-center justify-center mr-3">
                <Coffee className="text-white" size={20} />
              </div>
              <div>
                <p className="font-medium text-foreground">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Wallet Summary */}
        <Card className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl p-8 mb-8">
          <CardContent className="p-0">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-primary-foreground/80 mb-1">Current Balance</p>
                {walletLoading ? (
                  <div className="h-8 w-32 bg-primary-foreground/20 rounded animate-pulse" />
                ) : (
                  <p className="text-3xl font-bold currency-display">
                    {wallet?.balanceCZK || "0 CZK"}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-primary-foreground/80 mb-1">Café Added Total</p>
                {walletLoading ? (
                  <div className="h-6 w-24 bg-primary-foreground/20 rounded animate-pulse" />
                ) : (
                  <p className="text-xl font-semibold text-sage currency-display">
                    {wallet?.bonusGrantedTotalCZK || "0 CZK"}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex space-x-4">
              <Button 
                onClick={() => setLocation("/topup")}
                className="flex-1 h-12 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Top Up
              </Button>
              <Button 
                onClick={() => setLocation("/qr")}
                className="flex-1 h-12 bg-sage hover:bg-sage/90 text-white border-0"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Pay with QR
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-foreground">Recent Activity</h3>
            <Button 
              variant="ghost"
              onClick={() => setLocation("/history")}
              className="text-muted-foreground hover:text-foreground"
            >
              <History className="w-4 h-4 mr-2" />
              View All
            </Button>
          </div>
          
          {historyLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="card-easyloyalty">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-muted rounded-xl mr-3 animate-pulse" />
                        <div>
                          <div className="h-4 w-24 bg-muted rounded animate-pulse mb-2" />
                          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="h-4 w-20 bg-muted rounded animate-pulse mb-1" />
                        <div className="h-3 w-12 bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentTransactions?.transactions?.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.transactions.slice(0, 3).map((transaction: any) => (
                <Card key={transaction.id} className="card-easyloyalty">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${
                          transaction.type === "topup" ? "bg-sage" : "bg-dusty"
                        }`}>
                          {transaction.type === "topup" ? (
                            <Plus className="text-white text-sm" size={16} />
                          ) : (
                            <Coffee className="text-white text-sm" size={16} />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {transaction.type === "topup" ? 
                              `Top-up ${transaction.meta?.packageCode || ""}` : 
                              "Café Payment"
                            }
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold currency-display ${
                          transaction.amountCents > 0 ? "text-sage" : "text-foreground"
                        }`}>
                          {transaction.amountCents > 0 ? "+" : ""}{transaction.amountCZK}
                        </p>
                        {transaction.type === "topup" && transaction.meta?.bonusCents && (
                          <p className="text-xs text-muted-foreground">
                            +{formatCurrency(transaction.meta.bonusCents)} bonus
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="card-easyloyalty">
              <CardContent className="p-8 text-center">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No transactions yet</p>
                <Button 
                  onClick={() => setLocation("/topup")} 
                  className="btn-primary mt-4"
                >
                  Make Your First Top-up
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
