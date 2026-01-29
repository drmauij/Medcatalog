import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Stethoscope, 
  Store, 
  FileText, 
  ShoppingCart, 
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import type { Clinic } from "@shared/schema";
import { RoleSwitcher } from "@/components/role-switcher";
import ClinicOverview from "./overview";
import BrowseCatalog from "./browse-catalog";
import MyQuotations from "./my-quotations";
import MyOrders from "./my-orders";

const menuItems = [
  { id: "overview", title: "Übersicht", icon: LayoutDashboard },
  { id: "catalog", title: "Katalog durchsuchen", icon: Store },
  { id: "quotations", title: "Meine Offerten", icon: FileText },
  { id: "orders", title: "Meine Bestellungen", icon: ShoppingCart },
];

interface ClinicDashboardProps {
  clinic: Clinic;
}

export default function ClinicDashboard({ clinic }: ClinicDashboardProps) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: stats, isLoading: statsLoading } = useQuery<{
    pendingQuotations: number;
    activeOrders: number;
    totalOrders: number;
  }>({
    queryKey: ["/api/clinic/stats", clinic.id],
  });

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <ClinicOverview clinic={clinic} stats={stats} isLoading={statsLoading} />;
      case "catalog":
        return <BrowseCatalog clinicId={clinic.id} />;
      case "quotations":
        return <MyQuotations clinicId={clinic.id} />;
      case "orders":
        return <MyOrders clinicId={clinic.id} />;
      default:
        return <ClinicOverview clinic={clinic} stats={stats} isLoading={statsLoading} />;
    }
  };

  const getPageTitle = () => {
    const item = menuItems.find(m => m.id === activeTab);
    return item?.title || "Übersicht";
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{clinic.name}</p>
                <p className="text-xs text-muted-foreground">Klinikportal</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menü</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveTab(item.id)}
                        isActive={activeTab === item.id}
                        data-testid={`menu-${item.id}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {item.id === "quotations" && stats?.pendingQuotations ? (
                          <span className="ml-auto text-xs bg-chart-3 text-white px-2 py-0.5 rounded-full">
                            {stats.pendingQuotations}
                          </span>
                        ) : null}
                        {item.id === "orders" && stats?.activeOrders ? (
                          <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            {stats.activeOrders}
                          </span>
                        ) : null}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>
                  {user?.firstName?.[0] || user?.email?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.firstName || user?.email || "Benutzer"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logout()}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-4 p-4 border-b bg-background/95 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="font-semibold text-lg">{getPageTitle()}</h1>
            </div>
            <div className="flex items-center gap-2">
              <RoleSwitcher
                currentRole="clinic"
                currentEntityId={clinic.id}
                currentEntityName={clinic.name}
              />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
