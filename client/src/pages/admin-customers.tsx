import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Store, LogOut, Download, Search, DollarSign, History, ArrowLeft } from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
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
    queryFn: () => api.get(`/api/admin/customers?query=${encodeURIComponent(debouncedSearch)}`),
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
  const filteredCustomers = customers; // In a real app, you'd filter based on searchQuery here

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-200 to-white text-high-contrast">
      {/* Header */}
      <div className="bg-white border-b-2 border-amber-200 sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/admin/dashboard")}
                className="mr-4 text-amber-700 hover:bg-amber-50 rounded-xl"
              >
                <ArrowLeft size={24} />
              </Button>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
                <Store className="text-white" size={20} />
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

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-amber-600" />
            <h1 className="text-3xl font-bold text-amber-900">Správa zákazníků</h1>
          </div>
          <Button onClick={handleExport} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold rounded-2xl px-6 py-3 shadow-lg">
            <Download className="w-5 h-5 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600" size={20} />
            <Input
              type="text"
              placeholder="Hledat zákazníky podle jména nebo emailu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg rounded-2xl border-2 border-amber-200 bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-100 shadow-sm text-amber-900"
            />
          </div>
        </div>

        {/* Customer List */}
        {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="bg-white border-2 border-amber-200 rounded-3xl shadow-lg p-6 animate-pulse">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                        <div className="h-3 w-48 bg-gray-200 rounded" />
                      </div>
                      <div className="text-right">
                        <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
                        <div className="h-3 w-20 bg-gray-200 rounded" />
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="h-8 w-20 bg-gray-200 rounded" />
                      <div className="h-8 w-20 bg-gray-200 rounded" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : customers.length > 0 ? (
              <div className="space-y-6">
                {customers.map((customer: any) => (
                  <Card key={customer.id} className="bg-white border-2 border-amber-200 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-amber-900 mb-2">{customer.name}</h3>
                          <p className="text-base text-amber-700 mb-1">{customer.email}</p>
                          <p className="text-sm text-amber-600">Člen od: {new Date(customer.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <div className="mb-3">
                            <p className="text-2xl font-bold text-green-600">{customer.balance_czk}</p>
                            <p className="text-sm text-amber-600">+{customer.total_bonus_czk} celkový bonus</p>
                          </div>
                          <Button 
                            variant="outline"
                            className="border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold rounded-2xl px-4 py-2"
                            onClick={() => {
                              toast({
                                title: "Feature Coming Soon",
                                description: "Balance adjustment feature will be available soon",
                                variant: "default"
                              });
                            }}
                          >
                            <DollarSign className="w-3 h-3 mr-1" />
                            Adjust
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs ml-2 border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold rounded-2xl px-4 py-2"
                            onClick={() => {
                              toast({
                                title: "Feature Coming Soon",
                                description: "Customer history feature will be available soon",
                                variant: "default"
                              });
                            }}
                          >
                            <History className="w-3 h-3 mr-1" />
                            Historie
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Users className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-amber-700 mb-2">
                  {searchQuery ? "Žádní zákazníci nenalezeni" : "Zatím žádní zákazníci"}
                </h3>
                <p className="text-amber-600">
                  {searchQuery 
                    ? "Zkuste upravit kritéria vyhledávání" 
                    : "Účty zákazníků se zde zobrazí po jejich registraci"
                  }
                </p>
              </div>
            )}
      </div>
    </div>
  );
}