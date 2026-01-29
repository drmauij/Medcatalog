import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, FileText, ShoppingCart, TrendingUp, Clock, Package } from "lucide-react";
import type { Clinic } from "@shared/schema";

interface ClinicOverviewProps {
  clinic: Clinic;
  stats?: {
    pendingQuotations: number;
    activeOrders: number;
    totalOrders: number;
  };
  isLoading: boolean;
  onNavigate?: (tab: string) => void;
}

export default function ClinicOverview({ clinic, stats, isLoading, onNavigate }: ClinicOverviewProps) {
  const handleNavigate = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  const statCards = [
    {
      title: "Offene Offerten",
      value: stats?.pendingQuotations ?? 0,
      icon: FileText,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
      description: "Warten auf Lieferantenantwort",
      tab: "quotations",
    },
    {
      title: "Aktive Bestellungen",
      value: stats?.activeOrders ?? 0,
      icon: ShoppingCart,
      color: "text-primary",
      bgColor: "bg-primary/10",
      description: "Bestellungen in Bearbeitung",
      tab: "orders",
    },
    {
      title: "Gesamte Bestellungen",
      value: stats?.totalOrders ?? 0,
      icon: Package,
      color: "text-accent",
      bgColor: "bg-accent/10",
      description: "Alle bisherigen Bestellungen",
      tab: "orders",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Willkommen zurück!</h2>
        <p className="text-muted-foreground">
          Verwalten Sie Ihre Bestellungen und Offerten für {clinic.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card 
            key={stat.title} 
            className="hover-elevate cursor-pointer"
            onClick={() => handleNavigate(stat.tab)}
            data-testid={`stat-${stat.tab}`}
          >
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
                <>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </>
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
            Häufige Aufgaben für den Einstieg
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card 
              className="hover-elevate cursor-pointer"
              onClick={() => handleNavigate("catalog")}
              data-testid="action-browse-catalog"
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Katalog durchsuchen</p>
                  <p className="text-xs text-muted-foreground">Benötigte Produkte finden</p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className="hover-elevate cursor-pointer"
              onClick={() => handleNavigate("quotations")}
              data-testid="action-request-quotation"
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-chart-3" />
                </div>
                <div>
                  <p className="font-medium">Offerten ansehen</p>
                  <p className="text-xs text-muted-foreground">Preise für Artikel erhalten</p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className="hover-elevate cursor-pointer"
              onClick={() => handleNavigate("orders")}
              data-testid="action-view-orders"
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium">Bestellungen ansehen</p>
                  <p className="text-xs text-muted-foreground">Ihre Bestellungen verfolgen</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Letzte Aktivitäten</CardTitle>
          <CardDescription>Ihre neuesten Aktualisierungen</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : stats?.pendingQuotations || stats?.activeOrders ? (
            <div className="space-y-3">
              {stats.pendingQuotations > 0 && (
                <div 
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover-elevate"
                  onClick={() => handleNavigate("quotations")}
                  data-testid="activity-quotations"
                >
                  <div className="h-8 w-8 rounded-full bg-chart-3/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-chart-3" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {stats.pendingQuotations} offene Offerte{stats.pendingQuotations > 1 ? "n" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">Warten auf Lieferantenpreise</p>
                  </div>
                  <span className="text-xs text-primary font-medium">Ansehen →</span>
                </div>
              )}
              {stats.activeOrders > 0 && (
                <div 
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover-elevate"
                  onClick={() => handleNavigate("orders")}
                  data-testid="activity-orders"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {stats.activeOrders} aktive Bestellung{stats.activeOrders > 1 ? "en" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">Bestellungen in Bearbeitung</p>
                  </div>
                  <span className="text-xs text-primary font-medium">Ansehen →</span>
                </div>
              )}
            </div>
          ) : (
            <div 
              className="text-center py-8 cursor-pointer hover-elevate rounded-lg"
              onClick={() => handleNavigate("catalog")}
            >
              <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm">Keine aktuellen Aktivitäten</p>
              <p className="text-xs text-primary font-medium mt-2">Katalog durchsuchen →</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
