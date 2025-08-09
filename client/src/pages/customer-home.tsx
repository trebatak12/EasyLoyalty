
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coffee, Plus, QrCode, History, LogOut, Wallet, CreditCard } from "lucide-react";
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

  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useQuery<{
    balanceCZK: string;
    balanceCents: number;
    bonusGrantedTotalCZK: string;
    bonusGrantedTotalCents: number;
    lastActivity: string;
  }>({
    queryKey: ["/api/me/wallet"],
    enabled: isAuthenticated && !!api.authToken,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  const { data: recentTransactions, isLoading: historyLoading, refetch: refetchHistory } = useQuery<{
    transactions: any[];
  }>({
    queryKey: ["/api/me/history"], 
    enabled: isAuthenticated && !!api.authToken,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Listen for topup completion and refresh data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('refreshData') === 'true') {
      console.log("Refreshing wallet and history data after topup");
      refetchWallet();
      refetchHistory();
      window.history.replaceState({}, '', '/home');
    }
  }, [refetchWallet, refetchHistory]);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'hsl(35, 40%, 88%)' }}>
      {/* Header */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
              <Coffee className="text-on-secondary" size={20} />
            </div>
            <h1 className="text-xl font-semibold text-text">{user?.name}</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="bg-surface border border-primary text-primary hover:bg-primary hover:text-on-primary rounded-xl px-4 py-2 font-medium"
          >
            <LogOut size={16} className="mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="px-6 pb-8">
        {/* Wallet Card */}
        <Card className="bg-primary rounded-3xl p-6 mb-6 shadow-soft border-0">
          <CardContent className="p-0">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wallet size={18} className="text-on-primary/90" />
                  <p className="text-on-primary/90 text-sm font-medium tracking-wide">WALLET BALANCE</p>
                </div>
                {walletLoading ? (
                  <div className="h-12 w-48 bg-on-primary/20 rounded-xl animate-pulse"></div>
                ) : (
                  <h2 className="text-4xl font-bold text-on-primary tracking-tight currency-display">
                    {formatCurrency(wallet?.balanceCents || 0)}
                  </h2>
                )}
              </div>
              <div className="w-12 h-12 bg-on-primary/20 rounded-xl flex items-center justify-center">
                <CreditCard size={20} className="text-on-primary/90" />
              </div>
            </div>
            
            {!walletLoading && wallet && (
              <div className="flex items-center justify-between pt-4 border-t border-on-primary/20">
                <div>
                  <p className="text-on-primary/80 text-sm mb-1">Total Bonus Earned</p>
                  <p className="text-lg font-semibold text-on-primary currency-display">
                    {formatCurrency(wallet.bonusGrantedTotalCents || 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-on-primary/80 text-sm mb-1">Available Credit</p>
                  <p className="text-lg font-semibold text-on-primary currency-display">
                    {formatCurrency(wallet.balanceCents || 0)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card 
            className="bg-surface border border-success/30 rounded-2xl p-4 shadow-soft cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => setLocation("/topup")}
          >
            <CardContent className="p-0 text-center">
              <div className="w-12 h-12 bg-success/20 rounded-xl mx-auto mb-3 flex items-center justify-center">
                <Plus size={20} className="text-success font-bold" />
              </div>
              <h3 className="font-semibold text-text mb-1">Top Up</h3>
              <p className="text-xs text-muted leading-tight">Add money and get bonus credits</p>
            </CardContent>
          </Card>

          <Card 
            className="bg-surface border border-text/20 rounded-2xl p-4 shadow-soft cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => setLocation("/qr")}
          >
            <CardContent className="p-0 text-center">
              <div className="w-12 h-12 bg-text/10 rounded-xl mx-auto mb-3 flex items-center justify-center">
                <QrCode size={20} className="text-text font-bold" />
              </div>
              <h3 className="font-semibold text-text mb-1">Pay with QR</h3>
              <p className="text-xs text-muted leading-tight">Generate payment code</p>
            </CardContent>
          </Card>

          <Card 
            className="bg-surface border border-accent/30 rounded-2xl p-4 shadow-soft cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => setLocation("/history")}
          >
            <CardContent className="p-0 text-center">
              <div className="w-12 h-12 bg-accent/20 rounded-xl mx-auto mb-3 flex items-center justify-center">
                <History size={20} className="text-accent font-bold" />
              </div>
              <h3 className="font-semibold text-text mb-1">History</h3>
              <p className="text-xs text-muted leading-tight">View all transactions</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-surface rounded-2xl shadow-soft border border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-text">Recent Activity</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation("/history")}
                className="text-text hover:bg-text/5 font-medium"
              >
                View All
              </Button>
            </div>
            
            {historyLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-surface/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-border rounded-lg animate-pulse"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-20 bg-border rounded animate-pulse"></div>
                        <div className="h-3 w-16 bg-border rounded animate-pulse"></div>
                      </div>
                    </div>
                    <div className="h-4 w-16 bg-border rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : recentTransactions?.transactions && recentTransactions.transactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.transactions.slice(0, 5).map((transaction: any) => (
                  <div key={transaction.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center">
                        <Plus size={14} className="text-success" />
                      </div>
                      <div>
                        <p className="font-medium text-text">
                          {transaction.type === 'topup' ? 'Top Up' :
                           transaction.type === 'charge' ? 'Payment' :
                           transaction.type}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-success currency-display">
                      +{formatCurrency(Math.abs(transaction.amountCents))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-muted/20 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <History size={20} className="text-muted" />
                </div>
                <p className="text-muted">No transactions yet</p>
                <p className="text-sm text-muted mt-1">Start by topping up your wallet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Logo */}
        <div className="text-center mt-8 pt-4">
          <div className="flex items-center justify-center gap-2 text-secondary">
            <Coffee size={20} />
            <span className="font-semibold">easyloyalty</span>
          </div>
        </div>
      </div>
    </div>
  );
}
