
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coffee, LogOut, Download, Search, DollarSign, History, ArrowLeft } from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export default function AdminCustomers() {
  const [, setLocation] = useLocation();
  const { admin, logout, isAuthenticated } = useAdminAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, setLocation]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: customersData, isLoading } = useQuery({
    queryKey: ["/api/admin/customers", { query: debouncedSearch }],
    queryFn: () => httpClient.get(`/api/admin/customers?query=${encodeURIComponent(debouncedSearch)}`),
    enabled: isAuthenticated
  });

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/customers/export.csv", {
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `customers-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Customer data has been exported to CSV",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export customer data",
        variant: "destructive"
      });
    }
  };

  const customers = customersData?.customers || [];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      {/* Header */}
      <div className="bg-white border-b-2 border-amber-200 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
                <Coffee className="text-white" size={20} />
              </div>
              <div>
                <p className="font-bold text-xl text-amber-900">{admin?.name}</p>
                <p className="text-base text-amber-700 font-medium">{admin?.role}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold rounded-xl px-4 py-2"
            >
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Navigation and Title */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => setLocation("/admin/dashboard")}
              className="mr-4 p-2 hover:bg-amber-50 hover:text-amber-700 rounded-2xl"
            >
              <ArrowLeft className="w-6 h-6 text-amber-700" />
            </Button>
            <h1 className="text-3xl font-bold text-amber-900">Customer Management</h1>
          </div>
          <Button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl px-6 py-3 shadow-lg"
          >
            <Download size={18} />
            Export CSV
          </Button>
        </div>

        <Card className="bg-white/90 border-2 border-amber-200 rounded-3xl shadow-lg">
          <CardContent className="pt-6">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={20} />
                <Input
                  type="text"
                  placeholder="Search customers by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 rounded-2xl border-2 border-amber-200 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-amber-900 font-medium transition-colors"
                />
              </div>
            </div>

            {/* Customer List */}
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-amber-200 rounded animate-pulse mb-2" />
                        <div className="h-3 w-48 bg-amber-200 rounded animate-pulse" />
                      </div>
                      <div className="text-right">
                        <div className="h-4 w-24 bg-amber-200 rounded animate-pulse mb-1" />
                        <div className="h-3 w-20 bg-amber-200 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="h-8 w-20 bg-amber-200 rounded animate-pulse" />
                      <div className="h-8 w-20 bg-amber-200 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : customers.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {customers.map((customer: any) => (
                  <div key={customer.id} className="bg-amber-50/70 rounded-2xl p-4 border border-amber-100 hover:bg-amber-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-amber-900 text-lg">{customer.name}</p>
                        <p className="text-sm text-amber-700">{customer.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-900 text-lg">
                          {customer.balanceCZK}
                        </p>
                        <p className="text-sm text-amber-700">
                          +{customer.bonusGrantedTotalCZK} total bonus
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <Button 
                        size="sm"
                        className="flex-1 h-10 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-sm shadow-md"
                        onClick={() => {
                          toast({
                            title: "Feature Coming Soon",
                            description: "Balance adjustment feature will be available soon",
                            variant: "default"
                          });
                        }}
                      >
                        <DollarSign className="w-4 h-4 mr-1" />
                        Adjust Balance
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        className="flex-1 h-10 border-2 border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold rounded-xl text-sm"
                        onClick={() => {
                          toast({
                            title: "Feature Coming Soon",
                            description: "Customer history feature will be available soon",
                            variant: "default"
                          });
                        }}
                      >
                        <History className="w-4 h-4 mr-1" />
                        History
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-amber-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-amber-600" />
                </div>
                <p className="text-amber-700 text-lg font-medium">
                  {searchQuery ? "No customers found matching your search" : "No customers registered yet"}
                </p>
                <p className="text-amber-600 text-sm mt-2">
                  {searchQuery ? "Try adjusting your search terms" : "Customers will appear here once they register"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
