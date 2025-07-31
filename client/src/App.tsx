import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { AdminAuthProvider } from "@/hooks/use-admin-auth";
import NotFound from "@/pages/not-found";
import ModeSelection from "@/pages/mode-selection";
import CustomerAuth from "@/pages/customer-auth";
import CustomerHome from "@/pages/customer-home";
import CustomerTopup from "@/pages/customer-topup";
import CustomerQR from "@/pages/customer-qr";
import CustomerHistory from "@/pages/customer-history";
import AdminAuth from "@/pages/admin-auth";
import AdminDashboard from "./pages/admin-dashboard";

import AdminCustomers from "@/pages/admin-customers";
import AdminSummaries from "@/pages/admin-summaries";
import POSCharge from "@/pages/pos-charge";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={ModeSelection} />
      <Route path="/auth/customer" component={CustomerAuth} />
      <Route path="/admin/login" component={AdminAuth} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      
      <Route path="/admin/customers" component={AdminCustomers} />
      <Route path="/admin/summaries" component={AdminSummaries} />

      {/* Customer routes (JWT protected) */}
      <Route path="/home" component={CustomerHome} />
      <Route path="/topup" component={CustomerTopup} />
      <Route path="/qr" component={CustomerQR} />
      <Route path="/history" component={CustomerHistory} />

      {/* Admin routes (session protected) */}
      <Route path="/admin" component={AdminDashboard} />
      {/* POS routes (admin protected) */}
      <Route path="/pos/charge" component={POSCharge} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AdminAuthProvider>
            <Toaster />
            <Router />
          </AdminAuthProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;