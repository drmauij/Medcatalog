import { useQuery } from "@tanstack/react-query";
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
import { ShoppingCart, Package, Clock, CheckCircle, Truck, XCircle, Building2 } from "lucide-react";
import type { Order, OrderItem, Product, Supplier } from "@shared/schema";

interface MyOrdersProps {
  clinicId: string;
}

interface OrderWithDetails extends Order {
  supplier?: Supplier;
  items?: (OrderItem & { product?: Product })[];
}

export default function MyOrders({ clinicId }: MyOrdersProps) {
  const { data: orders, isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/clinic/orders", clinicId],
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

  const getStatusSteps = (status: string) => {
    const steps = ["pending", "confirmed", "shipped", "delivered"];
    const stepLabels: Record<string, string> = {
      pending: "Offen",
      confirmed: "Bestätigt",
      shipped: "Versendet",
      delivered: "Geliefert",
    };
    const currentIndex = steps.indexOf(status);
    if (status === "cancelled") return [];
    return steps.map((step, index) => ({
      step,
      label: stepLabels[step],
      completed: index <= currentIndex,
      current: index === currentIndex,
    }));
  };

  const activeOrders = orders?.filter((o) => !["delivered", "cancelled"].includes(o.status)) ?? [];
  const completedOrders = orders?.filter((o) => ["delivered", "cancelled"].includes(o.status)) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Meine Bestellungen</h2>
        <p className="text-muted-foreground">Bestellungen und Lieferstatus verfolgen</p>
      </div>

      {/* Active Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-chart-4" />
            Aktive Bestellungen
          </CardTitle>
          <CardDescription>
            Bestellungen in Bearbeitung
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : activeOrders.length > 0 ? (
            <div className="space-y-6">
              {activeOrders.map((order) => {
                const steps = getStatusSteps(order.status);
                return (
                  <div key={order.id} className="p-4 rounded-lg border" data-testid={`order-${order.id}`}>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-chart-4/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-chart-4" />
                        </div>
                        <div>
                          <p className="font-medium">{order.supplier?.name || "Unbekannt"}</p>
                          <p className="text-sm text-muted-foreground">
                            Bestellt am {new Date(order.createdAt!).toLocaleDateString("de-CH")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{order.totalAmount} CHF</p>
                        {getStatusBadge(order.status)}
                      </div>
                    </div>

                    {/* Status Progress */}
                    {steps.length > 0 && (
                      <div className="flex items-center justify-between mb-6 px-4">
                        {steps.map((s, index) => (
                          <div key={s.step} className="flex items-center flex-1">
                            <div className="flex flex-col items-center">
                              <div
                                className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                  s.completed
                                    ? "bg-accent text-accent-foreground"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {s.step === "pending" && <Clock className="h-4 w-4" />}
                                {s.step === "confirmed" && <CheckCircle className="h-4 w-4" />}
                                {s.step === "shipped" && <Truck className="h-4 w-4" />}
                                {s.step === "delivered" && <Package className="h-4 w-4" />}
                              </div>
                              <span className={`text-xs mt-1 ${s.current ? "font-medium" : "text-muted-foreground"}`}>
                                {s.label}
                              </span>
                            </div>
                            {index < steps.length - 1 && (
                              <div
                                className={`flex-1 h-0.5 mx-2 ${
                                  s.completed && steps[index + 1].completed
                                    ? "bg-accent"
                                    : "bg-muted"
                                }`}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Artikel-Nr.</TableHead>
                          <TableHead>Beschreibung</TableHead>
                          <TableHead>Menge</TableHead>
                          <TableHead>Preis</TableHead>
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
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Keine aktiven Bestellungen</p>
              <p className="text-sm text-muted-foreground">
                Geben Sie eine Bestellung auf, indem Sie eine Offerte annehmen
              </p>
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
                      <span className="font-medium">{order.supplier?.name || "Unbekannt"}</span>
                      {getStatusBadge(order.status)}
                      <span className="text-sm text-muted-foreground">{order.totalAmount} CHF</span>
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
                          <TableHead>Preis</TableHead>
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
