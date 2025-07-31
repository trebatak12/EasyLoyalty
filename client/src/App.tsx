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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AdminAuthProvider>
            <Switch>
              {/* Public routes */}
              <Route path="/" component={ModeSelection} />
              <Route path="/auth/customer" component={CustomerAuth} />

              {/* Customer routes (JWT protected) */}
              <Route path="/home" component={CustomerHome} />
              <Route path="/topup" component={CustomerTopup} />
              <Route path="/qr" component={CustomerQR} />
              <Route path="/history" component={CustomerHistory} />

              {/* Admin Routes */}
              <Route path="/admin/login" component={AdminAuth} />
              <Route path="/admin/dashboard" component={AdminDashboard} />
              <Route path="/admin/customers" component={AdminCustomers} />
              <Route path="/admin/summaries" component={AdminSummaries} />

              {/* POS routes */}
              <Route path="/pos/*">
                <Switch>
                  <Route path="/pos/charge" component={POSCharge} />
                </Switch>
              </Route>

              {/* Fallback to 404 */}
              <Route component={NotFound} />
            </Switch>
          </AdminAuthProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;