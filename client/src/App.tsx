import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import AdminAcceptPayment from "@/pages/admin-accept-payment";
import AdminCustomers from "@/pages/admin-customers";
import AdminSummaries from "@/pages/admin-summaries";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={ModeSelection} />
      <Route path="/auth/customer" component={CustomerAuth} />
      <Route path="/admin/login" component={AdminAuth} />

      {/* Customer routes (JWT protected) */}
      <Route path="/home" component={CustomerHome} />
      <Route path="/topup" component={CustomerTopup} />
      <Route path="/qr" component={CustomerQR} />
      <Route path="/history" component={CustomerHistory} />

      {/* Admin routes (session protected) */}
      <Route path="/admin" component={() => { window.location.href = "/admin/accept"; return null; }} />
      <Route path="/admin/accept" component={AdminAcceptPayment} />
      <Route path="/admin/customers" component={AdminCustomers} />
      <Route path="/admin/summaries" component={AdminSummaries} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AdminAuthProvider>
          <Toaster />
          <Router />
        </AdminAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;