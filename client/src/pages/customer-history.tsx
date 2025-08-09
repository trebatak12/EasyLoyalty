
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/home")}
            className="mr-4 p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">Transaction History</h1>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterType)} className="mb-8">
          <TabsList className="grid w-full grid-cols-3 bg-amber-100 rounded-full p-1 h-12">
            <TabsTrigger 
              value="all" 
              className="rounded-full text-gray-700 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm font-medium"
            >
              All
            </TabsTrigger>
            <TabsTrigger 
              value="topups" 
              className="rounded-full text-amber-700 data-[state=active]:bg-amber-200 data-[state=active]:text-amber-900 data-[state=active]:shadow-sm font-medium"
            >
              Top-ups
            </TabsTrigger>
            <TabsTrigger 
              value="transactions" 
              className="rounded-full text-amber-700 data-[state=active]:bg-amber-200 data-[state=active]:text-amber-900 data-[state=active]:shadow-sm font-medium"
            >
              Payments
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-8">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white rounded-3xl border border-gray-200 p-6 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="h-5 w-32 bg-gray-200 rounded"></div>
                      <div className="h-4 w-4 bg-gray-200 rounded"></div>
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
                    <Card key={transaction.id} className="bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-0">
                        {/* Main row - always visible */}
                        <div 
                          className="p-6 cursor-pointer"
                          onClick={() => toggleExpanded(transaction.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-gray-900 text-lg">
                                {transactionTitle}
                              </h3>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`font-semibold text-lg ${
                                transaction.amountCents > 0 ? "text-green-600" : "text-gray-900"
                              }`}>
                                {transaction.amountCents > 0 ? "+" : ""}{transaction.amountCZK}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="px-6 pb-6 pt-0 border-t border-gray-100">
                            <div className="grid grid-cols-2 gap-6 mt-4">
                              <div>
                                <p className="text-sm text-gray-500 mb-1">Date & Time</p>
                                <p className="text-gray-900 font-medium">
                                  {new Date(transaction.createdAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric"
                                  })}
                                </p>
                                <p className="text-gray-600 text-sm">
                                  {new Date(transaction.createdAt).toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-sm text-gray-500 mb-1">Type</p>
                                <div className="flex items-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                                    transaction.type === "topup" 
                                      ? "bg-green-100" 
                                      : transaction.type === "void"
                                        ? "bg-red-100"
                                        : "bg-blue-100"
                                  }`}>
                                    {transaction.type === "topup" ? (
                                      <Plus className={`w-4 h-4 ${
                                        transaction.type === "topup" ? "text-green-600" : "text-blue-600"
                                      }`} />
                                    ) : (
                                      <Coffee className={`w-4 h-4 ${
                                        transaction.type === "void" ? "text-red-600" : "text-blue-600"
                                      }`} />
                                    )}
                                  </div>
                                  <span className="text-gray-900 font-medium capitalize">
                                    {transaction.type === "topup" ? "Top-up" : 
                                     transaction.type === "void" ? "Voided Payment" : "Payment"}
                                  </span>
                                </div>
                              </div>

                              {transaction.type === "topup" && transaction.meta?.bonusCents && (
                                <div className="col-span-2">
                                  <p className="text-sm text-gray-500 mb-1">Bonus Received</p>
                                  <p className="text-green-600 font-semibold">
                                    +{formatCurrency(transaction.meta.bonusCents)}
                                  </p>
                                </div>
                              )}

                              <div className="col-span-2">
                                <p className="text-sm text-gray-500 mb-1">Transaction ID</p>
                                <p className="text-gray-600 text-sm font-mono">
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
              <Card className="bg-white rounded-3xl border border-gray-200 shadow-sm">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                    <Coffee className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No {filter === "all" ? "transactions" : filter} found
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
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
                      className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
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
