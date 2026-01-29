import { Switch, Route, Redirect, useParams } from "wouter";
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
import AcceptInvitePage from "@/pages/accept-invite";
import AcceptClinicInvitePage from "@/pages/accept-clinic-invite";
import AddRole from "@/pages/add-role";
import type { Supplier, Clinic, UserRole } from "@shared/schema";

interface UserRoleData {
  role: UserRole;
  supplier?: Supplier;
  clinic?: Clinic;
}

interface EnrichedRole {
  role: UserRole;
  supplier: Supplier | null;
  clinic: Clinic | null;
}

function AuthenticatedApp() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: roles, isLoading: rolesLoading, refetch } = useQuery<EnrichedRole[]>({
    queryKey: ["/api/user/roles"],
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

  if (rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    );
  }

  if (!roles || roles.length === 0) {
    return <RoleSelection onComplete={() => refetch()} />;
  }

  // Redirect to first role's dashboard
  const firstRole = roles[0];
  if (firstRole.role.role === "supplier" && firstRole.supplier) {
    return <Redirect to={`/supplier/${firstRole.supplier.id}`} />;
  }

  if (firstRole.role.role === "clinic" && firstRole.clinic) {
    return <Redirect to={`/clinic/${firstRole.clinic.id}`} />;
  }

  return <RoleSelection onComplete={() => refetch()} />;
}

function SupplierRoute() {
  const { user, isLoading: authLoading } = useAuth();
  const params = useParams<{ id: string }>();

  const { data: roles, isLoading: rolesLoading } = useQuery<EnrichedRole[]>({
    queryKey: ["/api/user/roles"],
    enabled: !!user,
    retry: false,
  });

  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  // Find the specific supplier role by ID from URL
  const supplierRole = roles?.find(
    r => r.role.role === "supplier" && r.supplier && r.supplier.id === params.id
  );
  if (!supplierRole || !supplierRole.supplier) {
    return <NotFound />;
  }

  return <SupplierDashboard supplier={supplierRole.supplier} />;
}

function ClinicRoute() {
  const { user, isLoading: authLoading } = useAuth();
  const params = useParams<{ id: string }>();

  const { data: roles, isLoading: rolesLoading } = useQuery<EnrichedRole[]>({
    queryKey: ["/api/user/roles"],
    enabled: !!user,
    retry: false,
  });

  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  // Find the specific clinic role by ID from URL
  const clinicRole = roles?.find(
    r => r.role.role === "clinic" && r.clinic && r.clinic.id === params.id
  );
  if (!clinicRole || !clinicRole.clinic) {
    return <NotFound />;
  }

  return <ClinicDashboard clinic={clinicRole.clinic} />;
}

function AddRoleRoute() {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return <AddRole />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthenticatedApp} />
      <Route path="/supplier/:id" component={SupplierRoute} />
      <Route path="/supplier/:id/:page" component={SupplierRoute} />
      <Route path="/clinic/:id" component={ClinicRoute} />
      <Route path="/clinic/:id/:page" component={ClinicRoute} />
      <Route path="/add-role" component={AddRoleRoute} />
      <Route path="/invite/:token" component={AcceptInvitePage} />
      <Route path="/clinic-invite/:token" component={AcceptClinicInvitePage} />
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
