
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Coffee, ChevronDown, ChevronUp } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { formatCurrency } from "@/utils/currency";

type FilterType = "all" | "topups" | "transactions";

export default function CustomerHistory() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const { data: historyData, isLoading } = useQuery({
    queryKey: ["/api/me/history", { type: filter }],
    queryFn: () => api.get(`/api/me/history?type=${filter}`)
  });

  const transactions = historyData?.transactions || [];

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/home")}
            className="mr-4 p-2 hover:bg-surface rounded-full border-0"
          >
            <ArrowLeft className="w-5 h-5 text-text" />
          </Button>
          <h1 className="text-2xl font-semibold text-text">Transaction History</h1>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterType)} className="mb-8">
          <TabsList className="grid w-full grid-cols-3 bg-surface border border-border rounded-2xl p-1 h-12 shadow-soft">
            <TabsTrigger 
              value="all" 
              className="rounded-xl text-muted data-[state=active]:bg-primary data-[state=active]:text-on-primary data-[state=active]:shadow-sm font-medium transition-all"
            >
              All
            </TabsTrigger>
            <TabsTrigger 
              value="topups" 
              className="rounded-xl text-muted data-[state=active]:bg-primary data-[state=active]:text-on-primary data-[state=active]:shadow-sm font-medium transition-all"
            >
              Top-ups
            </TabsTrigger>
            <TabsTrigger 
              value="transactions" 
              className="rounded-xl text-muted data-[state=active]:bg-primary data-[state=active]:text-on-primary data-[state=active]:shadow-sm font-medium transition-all"
            >
              Payments
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-8">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="card-easyloyalty animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="h-5 w-32 bg-border rounded"></div>
                      <div className="h-4 w-4 bg-border rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((transaction: any) => {
                  const isExpanded = expandedItems.has(transaction.id);
                  const transactionTitle = transaction.type === "topup" 
                    ? `Top-up ${transaction.meta?.packageCode || ""}`
                    : transaction.type === "void"
                      ? "Payment Voided"
                      : "Café Payment";

                  return (
                    <Card key={transaction.id} className="card-easyloyalty hover:shadow-lg transition-shadow">
                      <CardContent className="p-0">
                        {/* Main row - always visible */}
                        <div 
                          className="p-6 cursor-pointer"
                          onClick={() => toggleExpanded(transaction.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-text text-lg">
                                {transactionTitle}
                              </h3>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`font-semibold text-lg ${
                                transaction.amountCents > 0 ? "text-success" : "text-text"
                              }`}>
                                {transaction.amountCents > 0 ? "+" : ""}{transaction.amountCZK}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-muted" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-muted" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="px-6 pb-6 pt-0 border-t border-border">
                            <div className="grid grid-cols-2 gap-6 mt-4">
                              <div>
                                <p className="text-sm text-muted mb-1">Date & Time</p>
                                <p className="text-text font-medium">
                                  {new Date(transaction.createdAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric"
                                  })}
                                </p>
                                <p className="text-muted text-sm">
                                  {new Date(transaction.createdAt).toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-sm text-muted mb-1">Type</p>
                                <div className="flex items-center">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center mr-3 ${
                                    transaction.type === "topup" 
                                      ? "bg-success/10" 
                                      : transaction.type === "void"
                                        ? "bg-danger/10"
                                        : "bg-info/10"
                                  }`}>
                                    {transaction.type === "topup" ? (
                                      <Plus className={`w-4 h-4 ${
                                        transaction.type === "topup" ? "text-success" : "text-info"
                                      }`} />
                                    ) : (
                                      <Coffee className={`w-4 h-4 ${
                                        transaction.type === "void" ? "text-danger" : "text-info"
                                      }`} />
                                    )}
                                  </div>
                                  <span className="text-text font-medium capitalize">
                                    {transaction.type === "topup" ? "Top-up" : 
                                     transaction.type === "void" ? "Voided Payment" : "Payment"}
                                  </span>
                                </div>
                              </div>

                              {transaction.type === "topup" && transaction.meta?.bonusCents && (
                                <div className="col-span-2">
                                  <p className="text-sm text-muted mb-1">Bonus Received</p>
                                  <p className="text-success font-semibold">
                                    +{formatCurrency(transaction.meta.bonusCents)}
                                  </p>
                                </div>
                              )}

                              <div className="col-span-2">
                                <p className="text-sm text-muted mb-1">Transaction ID</p>
                                <p className="text-muted text-sm font-mono">
                                  {transaction.id}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="card-easyloyalty">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                    <Coffee className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-text mb-2">
                    No {filter === "all" ? "transactions" : filter} found
                  </h3>
                  <p className="text-muted mb-6 max-w-md mx-auto">
                    {filter === "topups" 
                      ? "Start by making your first top-up to see your transaction history"
                      : filter === "transactions"
                        ? "Use your QR code to pay at the café and transactions will appear here"
                        : "Your transaction history will appear here once you start using the app"
                    }
                  </p>
                  {filter !== "transactions" && (
                    <Button 
                      onClick={() => setLocation("/topup")} 
                      className="btn-primary shadow-soft hover:shadow-lg transition-all duration-200"
                    >
                      Top Up Now
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
