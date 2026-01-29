import { Switch, Route } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import RoleSelection from "@/pages/role-selection";
import SupplierDashboard from "@/pages/supplier/dashboard";
import ClinicDashboard from "@/pages/clinic/dashboard";
import type { Supplier, Clinic, UserRole } from "@shared/schema";

interface UserRoleData {
  role: UserRole;
  supplier?: Supplier;
  clinic?: Clinic;
}

function AuthenticatedApp() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: roleData, isLoading: roleLoading, refetch } = useQuery<UserRoleData | null>({
    queryKey: ["/api/user/role"],
    enabled: !!user,
    retry: false,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    );
  }

  if (!roleData) {
    return <RoleSelection onComplete={() => refetch()} />;
  }

  if (roleData.role.role === "supplier" && roleData.supplier) {
    return <SupplierDashboard supplier={roleData.supplier} />;
  }

  if (roleData.role.role === "clinic" && roleData.clinic) {
    return <ClinicDashboard clinic={roleData.clinic} />;
  }

  return <RoleSelection onComplete={() => refetch()} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthenticatedApp} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
