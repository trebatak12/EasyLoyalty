import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Coffee } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { formatCurrency } from "@/utils/currency";

type FilterType = "all" | "topups" | "transactions";

export default function CustomerHistory() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<FilterType>("all");

  const { data: historyData, isLoading } = useQuery({
    queryKey: ["/api/me/history", { type: filter }],
    queryFn: () => api.get(`/api/me/history?type=${filter}`)
  });

  const transactions = historyData?.transactions || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/home")}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Transaction History</h1>
        </div>

        <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="topups">Top-ups</TabsTrigger>
            <TabsTrigger value="transactions">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value={filter}>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
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
            ) : transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((transaction: any) => (
                  <Card key={transaction.id} className="card-easyloyalty">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${
                            transaction.type === "topup" 
                              ? "bg-sage" 
                              : transaction.type === "void"
                                ? "bg-warning"
                                : "bg-dusty"
                          }`}>
                            {transaction.type === "topup" ? (
                              <Plus className="text-white" size={16} />
                            ) : (
                              <Coffee className="text-white" size={16} />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {transaction.type === "topup" 
                                ? `Top-up ${transaction.meta?.packageCode || ""}`
                                : transaction.type === "void"
                                  ? "Payment Voided"
                                  : "Café Payment"
                              }
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(transaction.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
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
                          {transaction.type === "void" && (
                            <p className="text-xs text-warning">Voided</p>
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
                  <Coffee className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">
                    No {filter === "all" ? "transactions" : filter} found
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {filter === "topups" 
                      ? "Start by making your first top-up"
                      : filter === "transactions"
                        ? "Use your QR code to pay at the café"
                        : "Your transaction history will appear here"
                    }
                  </p>
                  {filter !== "transactions" && (
                    <Button 
                      onClick={() => setLocation("/topup")} 
                      className="btn-primary"
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
