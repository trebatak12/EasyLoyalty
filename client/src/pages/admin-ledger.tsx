import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Calculator, 
  History, 
  Wallet, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Minus, 
  Gift, 
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Lock
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { ledgerClient } from "@/lib/api/ledgerClient";
import { formatCurrency } from "@/utils/currency";

interface Customer {
  id: string;
  email: string;
  name: string;
  ledgerBalance: number;
  legacyBalance: number;
}

interface LedgerTransaction {
  id: string;
  type: 'topup' | 'charge' | 'bonus' | 'reversal';
  createdAt: string;
  context: Record<string, any>;
  reversalOf?: string;
}

interface LedgerEntry {
  id: string;
  txId: string;
  accountCode: number;
  userId: string | null;
  side: 'debit' | 'credit';
  amountMinor: number;
}

interface TransactionDetail {
  transaction: LedgerTransaction;
  entries: LedgerEntry[];
}

interface Balance {
  accountCode: number;
  userId: string;
  balanceMinor: number;
  updatedAt: string;
}

export default function AdminLedger() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const { toast } = useToast();
  const { isAuthenticated, admin } = useAdminAuth();

  // Check feature flags
  const LEDGER_ENABLED = import.meta.env.VITE_LEDGER_ENABLED === 'true';
  const LEDGER_DEV_ENDPOINTS_ENABLED = import.meta.env.VITE_LEDGER_DEV_ENDPOINTS_ENABLED !== 'false';

  // Early return if feature is disabled or user is not admin
  if (!LEDGER_ENABLED) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <Lock className="w-12 h-12 text-stone-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-stone-900 mb-2">Ledger System Disabled</h2>
            <p className="text-stone-600">
              The ledger system is currently disabled. Contact your system administrator to enable it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated || !admin) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <Lock className="w-12 h-12 text-stone-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-stone-900 mb-2">Admin Access Required</h2>
            <p className="text-stone-600">
              You need admin privileges to access the ledger system.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Search customers
  const customersQuery = useQuery({
    queryKey: ["customers", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return { customers: [] };
      
      // Use real customer search API
      return await ledgerClient.searchCustomers({ q: searchTerm, limit: 20 });
    },
    enabled: searchTerm.length >= 2,
    select: (data) => data.customers
  });

  // Get customer balance
  const balanceQuery = useQuery({
    queryKey: ["customerBalance", selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return null;
      return await ledgerClient.getBalance(selectedCustomerId);
    },
    enabled: !!selectedCustomerId
  });

  // Get customer transactions
  const transactionsQuery = useQuery({
    queryKey: ["customerTransactions", selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return { transactions: [], nextCursor: null, hasMore: false };
      return await ledgerClient.getTransactions({ userId: selectedCustomerId, limit: 20 });
    },
    enabled: !!selectedCustomerId
  });

  // Get transaction detail
  const transactionDetailQuery = useQuery({
    queryKey: ["transactionDetail", selectedTransaction],
    queryFn: async () => {
      if (!selectedTransaction) return null;
      return await ledgerClient.getTransaction(selectedTransaction);
    },
    enabled: !!selectedTransaction
  });

  // Get trial balance
  const trialBalanceQuery = useQuery({
    queryKey: ["trialBalance"],
    queryFn: () => ledgerClient.runTrialBalance(),
    refetchInterval: 60000 // Refresh every minute
  });

  // Mutations for ledger operations
  const topupMutation = useMutation({
    mutationFn: ({ userId, amount, note }: { userId: string; amount: number; note: string }) =>
      ledgerClient.devTopup({ userId, amountMinor: amount * 100, note }),
    onSuccess: () => {
      toast({ title: "Topup successful", description: "Customer balance has been updated" });
      // Invalidate queries to refresh data
      transactionsQuery.refetch();
      balanceQuery.refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: "Topup failed", 
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const chargeMutation = useMutation({
    mutationFn: ({ userId, amount, note }: { userId: string; amount: number; note: string }) =>
      ledgerClient.devCharge({ userId, amountMinor: amount * 100, note }),
    onSuccess: () => {
      toast({ title: "Charge successful", description: "Customer balance has been updated" });
      transactionsQuery.refetch();
      balanceQuery.refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: "Charge failed", 
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const bonusMutation = useMutation({
    mutationFn: ({ userId, amount, reason }: { userId: string; amount: number; reason: string }) =>
      ledgerClient.devBonus({ userId, amountMinor: amount * 100, reason }),
    onSuccess: () => {
      toast({ title: "Bonus applied", description: "Customer received bonus credit" });
      transactionsQuery.refetch();
      balanceQuery.refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: "Bonus failed", 
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const reversalMutation = useMutation({
    mutationFn: ({ txId }: { txId: string }) =>
      ledgerClient.devReversal({ txId }),
    onSuccess: () => {
      toast({ title: "Transaction reversed", description: "The transaction has been successfully reversed" });
      transactionsQuery.refetch();
      balanceQuery.refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: "Reversal failed", 
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const runTrialBalanceMutation = useMutation({
    mutationFn: () => ledgerClient.runTrialBalance(),
    onSuccess: () => {
      toast({ title: "Trial balance updated", description: "Trial balance has been recalculated" });
      trialBalanceQuery.refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: "Trial balance failed", 
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'topup': return <Plus className="w-4 h-4 text-green-600" />;
      case 'charge': return <Minus className="w-4 h-4 text-red-600" />;
      case 'bonus': return <Gift className="w-4 h-4 text-blue-600" />;
      case 'reversal': return <RotateCcw className="w-4 h-4 text-yellow-600" />;
      default: return <History className="w-4 h-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'topup': return 'bg-green-100 text-green-800 border-green-200';
      case 'charge': return 'bg-red-100 text-red-800 border-red-200';
      case 'bonus': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'reversal': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-stone-800">Ledger Management</h1>
            <p className="text-stone-600 mt-1">Manage customer accounts and monitor system balance</p>
          </div>
          
          {/* Trial Balance Status */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Calculator className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm font-medium">Trial Balance</div>
                <div className="flex items-center gap-2">
                  {trialBalanceQuery.data?.status === 'ok' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm ${trialBalanceQuery.data?.status === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                    {trialBalanceQuery.data?.status === 'ok' ? 'Balanced' : `Delta: ${trialBalanceQuery.data?.delta || 'Unknown'}`}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runTrialBalanceMutation.mutate()}
                    disabled={runTrialBalanceMutation.isPending}
                  >
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search">Customer Search</TabsTrigger>
            <TabsTrigger value="transactions">Transaction History</TabsTrigger>
            <TabsTrigger value="operations">Manual Operations</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            {/* Customer Search */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Customer Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by email or customer ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      data-testid="input-customer-search"
                    />
                  </div>
                  <Button variant="outline" data-testid="button-search">
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>

                {/* Search Results */}
                {customersQuery.data && customersQuery.data.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {customersQuery.data.map((customer) => (
                      <div
                        key={customer.id}
                        className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedCustomerId(customer.id)}
                        data-testid={`customer-item-${customer.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{customer.name || customer.email}</div>
                            <div className="text-sm text-gray-600">{customer.email}</div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selected Customer Balance */}
            {selectedCustomerId && balanceQuery.data && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    Customer Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-600 font-medium">Current Balance</div>
                      <div className="text-2xl font-bold text-blue-800" data-testid="text-current-balance">
                        {formatCurrency(balanceQuery.data.balanceMinor)}
                      </div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-sm text-green-600 font-medium">Customer ID</div>
                      <div className="text-sm font-bold text-green-800">
                        {selectedCustomerId}
                      </div>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <div className="text-sm text-yellow-600 font-medium">Last Updated</div>
                      <div className="text-sm font-medium text-yellow-800">
                        {new Date(balanceQuery.data.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            {/* Transaction History */}
            {selectedCustomerId && transactionsQuery.data && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Transaction History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3" data-testid="transaction-history">
                    {transactionsQuery.data?.transactions.map((tx: any) => (
                      <div
                        key={tx.id}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedTransaction(tx.id)}
                        data-testid={`transaction-${tx.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getTransactionIcon(tx.type)}
                            <div>
                              <div className="font-medium">{tx.id}</div>
                              <div className="text-sm text-gray-600">
                                {new Date(tx.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getTransactionColor(tx.type)}>
                              {tx.type.toUpperCase()}
                            </Badge>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transaction Detail */}
            {selectedTransaction && transactionDetailQuery.data && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Transaction Detail
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Transaction Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-600">Transaction ID</div>
                        <div className="font-mono text-sm">{transactionDetailQuery.data.transaction.id}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-600">Type</div>
                        <Badge className={getTransactionColor(transactionDetailQuery.data.transaction.type)}>
                          {transactionDetailQuery.data.transaction.type.toUpperCase()}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-600">Created At</div>
                        <div className="text-sm">{new Date(transactionDetailQuery.data.transaction.createdAt).toLocaleString()}</div>
                      </div>
                      {transactionDetailQuery.data.transaction.reversalOf && (
                        <div>
                          <div className="text-sm font-medium text-gray-600">Reversal Of</div>
                          <div className="font-mono text-sm">{transactionDetailQuery.data.transaction.reversalOf}</div>
                        </div>
                      )}
                    </div>

                    {/* Ledger Entries */}
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-2">Ledger Entries</div>
                      <div className="space-y-2">
                        {transactionDetailQuery.data.entries.map((entry: any) => (
                          <div key={entry.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                              <div>
                                <span className="font-medium">Account:</span> {entry.accountCode}
                              </div>
                              <div>
                                <span className="font-medium">Side:</span> {entry.side}
                              </div>
                              <div>
                                <span className="font-medium">Amount:</span> {formatCurrency(entry.amountMinor)}
                              </div>
                              <div>
                                <span className="font-medium">User:</span> {entry.userId || 'System'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reversal Action */}
                    {transactionDetailQuery.data.transaction.type !== 'reversal' && (
                      <div className="pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => reversalMutation.mutate({ txId: selectedTransaction })}
                          disabled={reversalMutation.isPending}
                          data-testid="button-reverse-transaction"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Reverse Transaction
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="operations" className="space-y-6">
            {/* Manual Operations - Only show if dev endpoints are enabled */}
            {selectedCustomerId && LEDGER_DEV_ENDPOINTS_ENABLED ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Topup */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <Plus className="w-5 h-5" />
                      Add Credit
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input 
                      type="number" 
                      placeholder="Amount (CZK)" 
                      id="topup-amount"
                      data-testid="input-topup-amount"
                    />
                    <Input 
                      placeholder="Note" 
                      id="topup-note"
                      data-testid="input-topup-note"
                    />
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        const amount = Number((document.getElementById('topup-amount') as HTMLInputElement)?.value);
                        const note = (document.getElementById('topup-note') as HTMLInputElement)?.value || '';
                        if (amount > 0) {
                          topupMutation.mutate({ userId: selectedCustomerId, amount, note });
                        }
                      }}
                      disabled={topupMutation.isPending}
                      data-testid="button-topup"
                    >
                      Add Credit
                    </Button>
                  </CardContent>
                </Card>

                {/* Charge */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <Minus className="w-5 h-5" />
                      Charge
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input 
                      type="number" 
                      placeholder="Amount (CZK)" 
                      id="charge-amount"
                      data-testid="input-charge-amount"
                    />
                    <Input 
                      placeholder="Note" 
                      id="charge-note"
                      data-testid="input-charge-note"
                    />
                    <Button 
                      className="w-full bg-red-600 hover:bg-red-700"
                      onClick={() => {
                        const amount = Number((document.getElementById('charge-amount') as HTMLInputElement)?.value);
                        const note = (document.getElementById('charge-note') as HTMLInputElement)?.value || '';
                        if (amount > 0) {
                          chargeMutation.mutate({ userId: selectedCustomerId, amount, note });
                        }
                      }}
                      disabled={chargeMutation.isPending}
                      data-testid="button-charge"
                    >
                      Apply Charge
                    </Button>
                  </CardContent>
                </Card>

                {/* Bonus */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <Gift className="w-5 h-5" />
                      Bonus
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input 
                      type="number" 
                      placeholder="Amount (CZK)" 
                      id="bonus-amount"
                      data-testid="input-bonus-amount"
                    />
                    <Input 
                      placeholder="Reason" 
                      id="bonus-reason"
                      data-testid="input-bonus-reason"
                    />
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        const amount = Number((document.getElementById('bonus-amount') as HTMLInputElement)?.value);
                        const reason = (document.getElementById('bonus-reason') as HTMLInputElement)?.value || '';
                        if (amount > 0) {
                          bonusMutation.mutate({ userId: selectedCustomerId, amount, reason });
                        }
                      }}
                      disabled={bonusMutation.isPending}
                      data-testid="button-bonus"
                    >
                      Apply Bonus
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : selectedCustomerId && !LEDGER_DEV_ENDPOINTS_ENABLED ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Lock className="w-12 h-12 text-stone-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Dev Operations Disabled</h3>
                  <p className="text-gray-600">
                    Manual operations are disabled in production mode. Dev endpoints must be enabled to access these features.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {!selectedCustomerId && (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Customer Selected</h3>
                  <p className="text-gray-600">Please search and select a customer to perform manual operations.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}