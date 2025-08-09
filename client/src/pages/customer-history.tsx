
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
            className="mr-4 p-2 hover:bg-yellow-50 hover:text-orange-700 rounded-2xl border-0"
          >
            <ArrowLeft className="w-6 h-6 text-orange-700" />
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterType)} className="mb-8">
          <TabsList className="grid w-full grid-cols-3 bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-1 h-14 shadow-strong">
            <TabsTrigger 
              value="all" 
              className="rounded-xl text-orange-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-400 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg font-bold transition-all text-base"
            >
              All
            </TabsTrigger>
            <TabsTrigger 
              value="topups" 
              className="rounded-xl text-orange-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-400 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg font-bold transition-all text-base"
            >
              Top-ups
            </TabsTrigger>
            <TabsTrigger 
              value="transactions" 
              className="rounded-xl text-orange-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-400 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg font-bold transition-all text-base"
            >
              Payments
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-8">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-6 shadow-strong animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="h-6 w-32 bg-yellow-200 rounded-xl"></div>
                      <div className="h-5 w-5 bg-yellow-200 rounded"></div>
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
                    <Card key={transaction.id} className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl shadow-strong hover:shadow-2xl transition-all duration-200">
                      <CardContent className="p-0">
                        {/* Main row - always visible */}
                        <div 
                          className="p-6 cursor-pointer"
                          onClick={() => toggleExpanded(transaction.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-bold text-xl text-gray-900">
                                {transactionTitle}
                              </h3>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className={`font-bold text-xl ${
                                transaction.amountCents > 0 ? "text-green-600" : "text-gray-900"
                              }`}>
                                {transaction.amountCents > 0 ? "+" : ""}{transaction.amountCZK}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-6 h-6 text-orange-700" />
                              ) : (
                                <ChevronDown className="w-6 h-6 text-orange-700" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="px-6 pb-6 pt-0 border-t-2 border-yellow-300">
                            <div className="grid grid-cols-2 gap-6 mt-6">
                              <div>
                                <p className="text-sm text-orange-700 font-bold mb-2">Date & Time</p>
                                <p className="text-gray-900 font-bold text-lg">
                                  {new Date(transaction.createdAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric"
                                  })}
                                </p>
                                <p className="text-orange-700 font-medium">
                                  {new Date(transaction.createdAt).toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-sm text-orange-700 font-bold mb-2">Type</p>
                                <div className="flex items-center">
                                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mr-3 border-2 ${
                                    transaction.type === "topup" 
                                      ? "bg-green-200 border-green-400" 
                                      : transaction.type === "void"
                                        ? "bg-red-200 border-red-400"
                                        : "bg-blue-200 border-blue-400"
                                  }`}>
                                    {transaction.type === "topup" ? (
                                      <Plus className={`w-5 h-5 ${
                                        transaction.type === "topup" ? "text-green-700 font-bold" : "text-blue-700 font-bold"
                                      }`} />
                                    ) : (
                                      <Coffee className={`w-5 h-5 ${
                                        transaction.type === "void" ? "text-red-700 font-bold" : "text-blue-700 font-bold"
                                      }`} />
                                    )}
                                  </div>
                                  <span className="text-gray-900 font-bold text-lg capitalize">
                                    {transaction.type === "topup" ? "Top-up" : 
                                     transaction.type === "void" ? "Voided Payment" : "Payment"}
                                  </span>
                                </div>
                              </div>

                              {transaction.type === "topup" && transaction.meta?.bonusCents && (
                                <div className="col-span-2">
                                  <p className="text-sm text-orange-700 font-bold mb-2">Bonus Received</p>
                                  <p className="text-green-600 font-bold text-lg">
                                    +{formatCurrency(transaction.meta.bonusCents)}
                                  </p>
                                </div>
                              )}

                              <div className="col-span-2">
                                <p className="text-sm text-orange-700 font-bold mb-2">Transaction ID</p>
                                <p className="text-orange-700 font-mono text-sm bg-yellow-100 p-2 rounded-xl border border-yellow-400">
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
              <Card className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl shadow-strong">
                <CardContent className="p-12 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-500 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-lg">
                    <Coffee className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    No {filter === "all" ? "transactions" : filter} found
                  </h3>
                  <p className="text-orange-700 font-medium text-lg mb-8 max-w-md mx-auto">
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
                      className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-bold rounded-2xl px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
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
