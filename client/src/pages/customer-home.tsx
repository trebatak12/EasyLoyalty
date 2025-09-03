import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coffee, Plus, QrCode, History, LogOut, Wallet, CreditCard } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http";
import { formatCurrency } from "@/utils/currency";
import { ledgerClient } from "@/lib/api/ledgerClient";

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
    enabled: isAuthenticated, // httpClient handles auth automatically
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Ledger balance query (new accounting system)
  const { data: ledgerBalance, isLoading: ledgerLoading } = useQuery({
    queryKey: ["ledgerBalance", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        return await ledgerClient.getBalance(user.id);
      } catch (error) {
        console.warn("Ledger balance fetch failed:", error);
        return null;
      }
    },
    enabled: isAuthenticated && !!user?.id,
    retry: false, // Don't retry if ledger system is not available
    staleTime: 30000 // Cache for 30 seconds
  });

  const { data: recentTransactions, isLoading: historyLoading, refetch: refetchHistory } = useQuery<{
    transactions: any[];
  }>({
    queryKey: ["/api/me/history"], 
    enabled: isAuthenticated, // httpClient handles auth automatically
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
              <div className="space-y-4 pt-4 border-t border-white/20">
                {/* Legacy system info */}
                <div className="flex items-center justify-between">
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
                
                {/* Ledger system comparison (if available) */}
                {ledgerBalance && (
                  <div className="bg-white/10 rounded-xl p-3 border border-white/20">
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-white/70">New Accounting Balance</p>
                        <p className="text-white font-semibold">
                          {formatCurrency(ledgerBalance.balanceMinor)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/70">System Status</p>
                        <p className="text-green-200 font-semibold text-xs">
                          {ledgerLoading ? "Loading..." : "Active"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-yellow-100 rounded-2xl border border-yellow-300 animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-yellow-200 rounded-2xl"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-24 bg-yellow-200 rounded-xl"></div>
                        <div className="h-3 w-20 bg-yellow-200 rounded-xl"></div>
                      </div>
                    </div>
                    <div className="h-5 w-16 bg-yellow-200 rounded-xl"></div>
                  </div>
                ))}
              </div>
            ) : recentTransactions?.transactions && recentTransactions.transactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.transactions.slice(0, 5).map((transaction: any) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 bg-yellow-100 rounded-2xl border border-yellow-300 hover:bg-yellow-150 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${
                        transaction.type === 'topup' ? 'bg-green-200 border-green-400' :
                        transaction.type === 'charge' ? 'bg-blue-200 border-blue-400' :
                        transaction.type === 'void' ? 'bg-red-200 border-red-400' :
                        'bg-orange-200 border-orange-400'
                      }`}>
                        {transaction.type === 'topup' ? (
                          <Plus size={18} className="text-green-700 font-bold" />
                        ) : transaction.type === 'charge' ? (
                          <Coffee size={18} className="text-blue-700 font-bold" />
                        ) : transaction.type === 'void' ? (
                          <QrCode size={18} className="text-red-700 font-bold" />
                        ) : (
                          <History size={18} className="text-orange-700 font-bold" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-base">
                          {transaction.type === 'topup' ? 
                            `Top-up ${transaction.meta?.packageCode || ''}` :
                           transaction.type === 'charge' ? 'Café Payment' :
                           transaction.type === 'void' ? 'Payment Voided' :
                           'Transaction'}
                        </p>
                        <p className="text-sm text-orange-700 font-medium">
                          {new Date(transaction.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric"
                          })} • {new Date(transaction.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>
                    <span className={`font-bold text-lg ${
                      transaction.amountCents > 0 ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {transaction.amountCents > 0 ? '+' : ''}
                      {transaction.amountCZK}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <History size={28} className="text-white" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">No activity yet</h4>
                <p className="text-orange-700 font-medium mb-6">Start by topping up your wallet to see your transaction history</p>
                <Button 
                  onClick={() => setLocation("/topup")} 
                  className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-bold rounded-2xl px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Top Up Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}