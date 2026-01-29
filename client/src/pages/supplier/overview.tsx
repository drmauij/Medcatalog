import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, FolderTree, FileText, ShoppingCart, TrendingUp } from "lucide-react";
import type { Supplier } from "@shared/schema";

interface SupplierOverviewProps {
  supplier: Supplier;
  stats?: {
    categories: number;
    products: number;
    pendingQuotations: number;
    pendingOrders: number;
  };
  isLoading: boolean;
}

export default function SupplierOverview({ supplier, stats, isLoading }: SupplierOverviewProps) {
  const statCards = [
    {
      title: "Kategorien",
      value: stats?.categories ?? 0,
      icon: FolderTree,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Produkte",
      value: stats?.products ?? 0,
      icon: Package,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Offene Offerten",
      value: stats?.pendingQuotations ?? 0,
      icon: FileText,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
    {
      title: "Offene Bestellungen",
      value: stats?.pendingOrders ?? 0,
      icon: ShoppingCart,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Willkommen zurück!</h2>
        <p className="text-muted-foreground">
          Hier ist eine Übersicht Ihres Katalogs und Ihrer Aktivitäten für {supplier.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`h-8 w-8 rounded-md ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{stat.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Schnellaktionen
          </CardTitle>
          <CardDescription>
            Häufige Aufgaben zur Verwaltung Ihres Katalogs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="hover-elevate cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Produkt hinzufügen</p>
                  <p className="text-xs text-muted-foreground">Neues Produkt zum Katalog hinzufügen</p>
                </div>
              </CardContent>
            </Card>
            <Card className="hover-elevate cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <FolderTree className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium">Kategorien verwalten</p>
                  <p className="text-xs text-muted-foreground">Produkte organisieren</p>
                </div>
              </CardContent>
            </Card>
            <Card className="hover-elevate cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-chart-3" />
                </div>
                <div>
                  <p className="font-medium">Offerten prüfen</p>
                  <p className="text-xs text-muted-foreground">Auf Preisanfragen antworten</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Letzte Aktivitäten</CardTitle>
          <CardDescription>Neueste Aktualisierungen und Aktionen</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : stats?.pendingQuotations || stats?.pendingOrders ? (
            <div className="space-y-3">
              {stats.pendingQuotations > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-8 w-8 rounded-full bg-chart-3/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-chart-3" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {stats.pendingQuotations} offene Offertanfrage{stats.pendingQuotations > 1 ? "n" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">Warten auf Ihre Antwort</p>
                  </div>
                </div>
              )}
              {stats.pendingOrders > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-8 w-8 rounded-full bg-chart-4/10 flex items-center justify-center">
                    <ShoppingCart className="h-4 w-4 text-chart-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {stats.pendingOrders} offene Bestellung{stats.pendingOrders > 1 ? "en" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">Warten auf Bestätigung</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">
              Keine aktuellen Aktivitäten
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
