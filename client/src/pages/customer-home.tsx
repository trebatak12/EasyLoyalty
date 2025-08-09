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
    enabled: isAuthenticated && !!api.authToken, // Wait for token to be set
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  const { data: recentTransactions, isLoading: historyLoading, refetch: refetchHistory } = useQuery<{
    transactions: any[];
  }>({
    queryKey: ["/api/me/history"], 
    enabled: isAuthenticated && !!api.authToken, // Wait for token to be set
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
      // Clear the URL parameter
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
    <div className="min-h-screen bg-bg text-high-contrast">
      {/* Modern Header */}
      <div className="bg-yellow-50 border-b-2 border-yellow-200 sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 via-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Coffee className="text-white" size={20} />
              </div>
              <div>
                <h1 className="font-bold text-xl text-gray-900">{user?.name}</h1>
                <p className="text-base text-gray-700 font-medium">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2 text-orange-700 border-orange-300 hover:bg-orange-50 hover:text-orange-800 font-semibold rounded-xl px-4 py-2"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Wallet Card */}
        <Card className="bg-gradient-to-br from-yellow-400 via-orange-500 to-orange-600 text-white rounded-3xl p-8 mb-8 shadow-2xl border-0">
          <CardContent className="p-0">
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wallet size={20} className="text-white/90" />
                  <p className="text-white/90 text-sm font-medium">WALLET BALANCE</p>
                </div>
                {walletLoading ? (
                  <div className="h-12 w-32 bg-white/20 rounded-2xl animate-pulse"></div>
                ) : (
                  <h2 className="text-4xl font-bold tracking-tight">
                    {formatCurrency(wallet?.balanceCents || 0)}
                  </h2>
                )}
              </div>
              <div className="w-16 h-16 bg-orange-800/40 rounded-2xl flex items-center justify-center">
                <CreditCard size={24} className="text-white/90" />
              </div>
            </div>
            
            {!walletLoading && wallet && (
              <div className="flex items-center justify-between pt-4 border-t border-white/20">
                <div>
                  <p className="text-white/70 text-sm">Total Bonus Earned</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(wallet.bonusGrantedTotalCents || 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/70 text-sm">Available Credit</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(wallet.balanceCents || 0)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card 
            className="bg-yellow-50 border-2 border-green-400 rounded-2xl p-6 shadow-strong hover:shadow-2xl transition-all duration-200 cursor-pointer hover:scale-[1.02]"
            onClick={() => setLocation("/topup")}
          >
            <CardContent className="p-0 text-center">
              <div className="w-16 h-16 bg-green-200 rounded-2xl mx-auto mb-4 flex items-center justify-center border-2 border-green-400">
                <Plus size={24} className="text-green-700 font-bold" />
              </div>
              <h3 className="font-bold text-xl text-gray-900 mb-2">Top Up</h3>
              <p className="text-base text-gray-700 font-medium">Add money and get bonus credits</p>
            </CardContent>
          </Card>

          <Card 
            className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-6 shadow-strong hover:shadow-2xl transition-all duration-200 cursor-pointer hover:scale-[1.02]"
            onClick={() => setLocation("/qr")}
          >
            <CardContent className="p-0 text-center">
              <div className="w-16 h-16 bg-yellow-200 rounded-2xl mx-auto mb-4 flex items-center justify-center border-2 border-yellow-400">
                <QrCode size={24} className="text-yellow-700 font-bold" />
              </div>
              <h3 className="font-bold text-xl text-gray-900 mb-2">Pay with QR</h3>
              <p className="text-base text-gray-700 font-medium">Generate payment code</p>
            </CardContent>
          </Card>

          <Card 
            className="bg-yellow-50 border-2 border-yellow-500 rounded-2xl p-6 shadow-strong hover:shadow-2xl transition-all duration-200 cursor-pointer hover:scale-[1.02]"
            onClick={() => setLocation("/history")}
          >
            <CardContent className="p-0 text-center">
              <div className="w-16 h-16 bg-yellow-300 rounded-2xl mx-auto mb-4 flex items-center justify-center border-2 border-yellow-500">
                <History size={24} className="text-yellow-800 font-bold" />
              </div>
              <h3 className="font-bold text-xl text-gray-900 mb-2">History</h3>
              <p className="text-base text-gray-700 font-medium">View all transactions</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl shadow-strong">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Recent Activity</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation("/history")}
                className="text-orange-700 border-orange-300 hover:bg-orange-50 font-semibold rounded-xl"
              >
                View All
              </Button>
            </div>
            
            {historyLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-surface/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-border rounded-xl animate-pulse"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-24 bg-border rounded animate-pulse"></div>
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
                  <div key={transaction.id} className="flex items-center justify-between p-4 bg-surface/30 rounded-xl hover:bg-surface/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        transaction.type === 'topup' ? 'bg-sage/10' :
                        transaction.type === 'charge' ? 'bg-primary/10' :
                        'bg-dusty/10'
                      }`}>
                        {transaction.type === 'topup' ? (
                          <Plus size={16} className="text-sage" />
                        ) : transaction.type === 'charge' ? (
                          <QrCode size={16} className="text-primary" />
                        ) : (
                          <History size={16} className="text-dusty" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {transaction.type === 'topup' ? 'Top Up' :
                           transaction.type === 'charge' ? 'Payment' :
                           transaction.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`font-semibold text-sm ${
                      transaction.amountCents > 0 ? 'text-sage' : 'text-foreground'
                    }`}>
                      {transaction.amountCents > 0 ? '+' : ''}
                      {formatCurrency(Math.abs(transaction.amountCents) / 100)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted/20 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <History size={24} className="text-muted" />
                </div>
                <p className="text-muted-foreground">No transactions yet</p>
                <p className="text-sm text-muted-foreground mt-1">Start by topping up your wallet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}