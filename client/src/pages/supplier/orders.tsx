import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ShoppingCart, Package, Clock, CheckCircle, Truck, XCircle, Building2 } from "lucide-react";
import type { Order, OrderItem, Product, Clinic } from "@shared/schema";

interface OrdersPageProps {
  supplierId: string;
}

interface OrderWithDetails extends Order {
  clinic?: Clinic;
  items?: (OrderItem & { product?: Product })[];
}

export default function OrdersPage({ supplierId }: OrdersPageProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/supplier/orders", supplierId],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier/orders", supplierId] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier/stats", supplierId] });
      toast({ title: "Bestellstatus aktualisiert" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-chart-3/10 text-chart-3 border-chart-3/20"><Clock className="h-3 w-3 mr-1" />Offen</Badge>;
      case "confirmed":
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20"><CheckCircle className="h-3 w-3 mr-1" />Bestätigt</Badge>;
      case "shipped":
        return <Badge variant="outline" className="bg-chart-4/10 text-chart-4 border-chart-4/20"><Truck className="h-3 w-3 mr-1" />Versendet</Badge>;
      case "delivered":
        return <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20"><Package className="h-3 w-3 mr-1" />Geliefert</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="h-3 w-3 mr-1" />Storniert</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingOrders = orders?.filter((o) => o.status === "pending") ?? [];
  const activeOrders = orders?.filter((o) => ["confirmed", "shipped"].includes(o.status)) ?? [];
  const completedOrders = orders?.filter((o) => ["delivered", "cancelled"].includes(o.status)) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Bestellungen</h2>
        <p className="text-muted-foreground">Kundenbestellungen verwalten und verfolgen</p>
      </div>

      {/* Pending Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-chart-3" />
            Offene Bestellungen
          </CardTitle>
          <CardDescription>
            {pendingOrders.length} Bestellung{pendingOrders.length !== 1 ? "en" : ""} warten auf Bestätigung
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : pendingOrders.length > 0 ? (
            <div className="space-y-4">
              {pendingOrders.map((order) => (
                <div key={order.id} className="p-4 rounded-lg border" data-testid={`order-${order.id}`}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-chart-3/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-chart-3" />
                      </div>
                      <div>
                        <p className="font-medium">{order.clinic?.name || "Unbekannte Klinik"}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.items?.length || 0} Artikel - {new Date(order.createdAt!).toLocaleDateString("de-CH")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.totalAmount && (
                        <div className="text-right">
                          <span className="font-semibold text-lg">{order.totalAmount} CHF</span>
                          <p className="text-xs text-muted-foreground">Netto, zzgl. MwSt.</p>
                        </div>
                      )}
                      <Button
                        onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "confirmed" })}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`button-confirm-${order.id}`}
                      >
                        Bestätigen
                      </Button>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Artikel-Nr.</TableHead>
                        <TableHead>Beschreibung</TableHead>
                        <TableHead>Menge</TableHead>
                        <TableHead>Preis (Netto)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.product?.articleNumber}</TableCell>
                          <TableCell className="max-w-xs truncate">{item.product?.description}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.price} CHF</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Keine offenen Bestellungen</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-chart-4" />
            Aktive Bestellungen
          </CardTitle>
          <CardDescription>
            Bestellungen in Bearbeitung oder Versand
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : activeOrders.length > 0 ? (
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-4 p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{order.clinic?.name || "Unbekannt"}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.items?.length} Artikel - {order.totalAmount} CHF (Netto)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(order.status)}
                    <Select
                      value={order.status}
                      onValueChange={(status) => updateStatusMutation.mutate({ orderId: order.id, status })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confirmed">Bestätigt</SelectItem>
                        <SelectItem value="shipped">Versendet</SelectItem>
                        <SelectItem value="delivered">Geliefert</SelectItem>
                        <SelectItem value="cancelled">Storniert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Keine aktiven Bestellungen</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Bestellverlauf
          </CardTitle>
          <CardDescription>
            Abgeschlossene und stornierte Bestellungen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
            </div>
          ) : completedOrders.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {completedOrders.map((order) => (
                <AccordionItem key={order.id} value={order.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4 flex-1 pr-4">
                      <span className="font-medium">{order.clinic?.name || "Unbekannt"}</span>
                      {getStatusBadge(order.status)}
                      <span className="text-sm text-muted-foreground">{order.totalAmount} CHF (Netto)</span>
                      <span className="text-sm text-muted-foreground ml-auto">
                        {new Date(order.createdAt!).toLocaleDateString("de-CH")}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Artikel-Nr.</TableHead>
                          <TableHead>Beschreibung</TableHead>
                          <TableHead>Menge</TableHead>
                          <TableHead>Preis (Netto)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.items?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">{item.product?.articleNumber}</TableCell>
                            <TableCell className="max-w-xs truncate">{item.product?.description}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.price} CHF</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Noch kein Bestellverlauf</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
