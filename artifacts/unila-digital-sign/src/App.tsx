import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/protected-route";
import { UserLayout } from "@/components/layout/user-layout";
import { AdminLayout } from "@/components/layout/admin-layout";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import SetupOtp from "@/pages/setup-otp";
import Dashboard from "@/pages/dashboard";
import DigitalId from "@/pages/digital-id";
import Certificate from "@/pages/certificate";
import Signature from "@/pages/signature";
import Documents from "@/pages/documents";
import SignDocument from "@/pages/sign-document";
import Verify from "@/pages/verify";
import VerifyQr from "@/pages/verify-qr";
import Settings from "@/pages/settings";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminDigitalIds from "@/pages/admin/digital-ids";
import AdminSignRequests from "@/pages/admin/sign-requests";
import AdminUsers from "@/pages/admin/users";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/login" />} />
      <Route path="/login" component={Login} />
      <Route path="/setup-otp" component={SetupOtp} />
      <Route path="/verify-qr/:token" component={VerifyQr} />

      {/* User Routes */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <UserLayout><Dashboard /></UserLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/digital-id">
        <ProtectedRoute>
          <UserLayout><DigitalId /></UserLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/certificate">
        <ProtectedRoute>
          <UserLayout><Certificate /></UserLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/signature">
        <ProtectedRoute>
          <UserLayout><Signature /></UserLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/documents">
        <ProtectedRoute>
          <UserLayout><Documents /></UserLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/documents/:id/sign">
        <ProtectedRoute>
          <UserLayout><SignDocument /></UserLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/verify">
        <ProtectedRoute>
          <UserLayout><Verify /></UserLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <UserLayout><Settings /></UserLayout>
        </ProtectedRoute>
      </Route>

      {/* Admin Routes */}
      <Route path="/admin/dashboard">
        <ProtectedRoute requireAdmin>
          <AdminLayout><AdminDashboard /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/digital-ids">
        <ProtectedRoute requireAdmin>
          <AdminLayout><AdminDigitalIds /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/sign-requests">
        <ProtectedRoute requireAdmin>
          <AdminLayout><AdminSignRequests /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute requireAdmin>
          <AdminLayout><AdminUsers /></AdminLayout>
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter hook={useHashLocation} base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
