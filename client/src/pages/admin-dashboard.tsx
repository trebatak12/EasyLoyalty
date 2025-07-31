import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Users, TrendingUp, Clock, ArrowUpRight, Plus, Minus, RotateCcw, Coffee, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DashboardData {
  todayTotalCents: number;
  todayTotalCZK: string;
  todayCount: number;
  membersCount: number;
  recentTransactions: Array<{
    id: string;
    type: 'topup' | 'charge' | 'void' | 'adjustment';
    amountCents: number;
    amountCZK: string;
    createdAt: string;
    user: { name: string };
    meta?: any;
  }>;
}

function StatsRow({ data }: { data: DashboardData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="border-2 border-green-200 bg-green-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-800">
            Tržba dnes
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-900">
            {data.todayTotalCZK}
          </div>
          <p className="text-xs text-green-600 mt-1">
            Celkové příjmy za dnešní den
          </p>
        </CardContent>
      </Card>

      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-800">
            Počet plateb dnes
          </CardTitle>
          <CreditCard className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-900">
            {data.todayCount}
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Provedených transakcí
          </p>
        </CardContent>
      </Card>

      <Card className="border-2 border-purple-200 bg-purple-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-purple-800">
            Aktivních členů
          </CardTitle>
          <Users className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-900">
            {data.membersCount}
          </div>
          <p className="text-xs text-purple-600 mt-1">
            Registrovaných zákazníků
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function AcceptButton() {
  const [, setLocation] = useLocation();

  return (
    <Button 
      onClick={() => setLocation("/pos/charge")}
      className="w-full h-16 text-lg font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-lg mb-8"
    >
      <CreditCard className="w-6 h-6 mr-3" />
      Přijmout platbu
      <ArrowUpRight className="w-5 h-5 ml-3" />
    </Button>
  );
}

function RecentTransactions({ transactions }: { transactions: DashboardData['recentTransactions'] }) {
  const [, setLocation] = useLocation();

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'topup':
        return <Plus className="w-4 h-4 text-white" />;
      case 'void':
        return <RotateCcw className="w-4 h-4 text-white" />;
      default:
        return <Minus className="w-4 h-4 text-white" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'topup':
        return 'bg-green-500';
      case 'void':
        return 'bg-red-500';
      default:
        return 'bg-gray-600';
    }
  };

  const getTransactionLabel = (type: string, meta?: any) => {
    switch (type) {
      case 'topup':
        return `Dobití ${meta?.packageCode || ''}`;
      case 'void':
        return 'Storno platby';
      case 'charge':
        return 'Platba v kavárně';
      default:
        return 'Úprava';
    }
  };

  const getTransactionStatus = (type: string) => {
    switch (type) {
      case 'topup':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Dobití</Badge>;
      case 'void':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Storno</Badge>;
      case 'charge':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Platba</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Úprava</Badge>;
    }
  };

  return (
    <Card className="border-2 border-amber-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-amber-900">Nedávné transakce</CardTitle>
          <Button 
            variant="outline"
            onClick={() => setLocation("/admin/transactions")}
            className="border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            Zobrazit vše
            <ArrowUpRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-amber-600">
            Žádné transakce dnes
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div 
                key={transaction.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-amber-100 hover:bg-amber-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTransactionColor(transaction.type)}`}>
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div>
                    <p className="font-medium text-amber-900 text-sm">
                      {getTransactionLabel(transaction.type, transaction.meta)}
                    </p>
                    <p className="text-xs text-amber-600">
                      {transaction.user.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {getTransactionStatus(transaction.type)}
                  <div className="text-right">
                    <div className="font-medium text-amber-900">
                      {transaction.type === 'topup' ? '+' : ''}
                      {transaction.amountCZK}
                    </div>
                    <div className="text-xs text-amber-600">
                      {new Date(transaction.createdAt).toLocaleTimeString('cs-CZ', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check admin authentication
  const { data: admin, error } = useQuery({
    queryKey: ["/api/admin/me"],
    retry: false
  });

  if (error && error.message.includes("401")) {
    setLocation("/admin/login");
    return null;
  }

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/admin/dashboard"],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { logout } = useAdminAuth();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      setLocation("/admin/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
          <p className="mt-2 text-amber-700">Načítání...</p>
        </div>
      </div>
    );
  }

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

      <div className="max-w-7xl mx-auto p-6">
        {isLoading ? (
          <div className="space-y-6">
            {/* Loading stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-2 border-amber-200">
                  <CardContent className="p-6">
                    <div className="animate-pulse">
                      <div className="h-4 bg-amber-200 rounded w-3/4 mb-2"></div>
                      <div className="h-8 bg-amber-200 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Loading button */}
            <div className="h-16 bg-amber-200 rounded-xl animate-pulse"></div>
            {/* Loading transactions */}
            <Card className="border-2 border-amber-200">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-amber-100 rounded"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : dashboardData ? (
          <>
            <StatsRow data={dashboardData} />
            <AcceptButton />
            <RecentTransactions transactions={dashboardData.recentTransactions} />
          </>
        ) : null}
      </div>
    </div>
  );
}