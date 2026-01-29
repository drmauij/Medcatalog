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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileText, Clock, CheckCircle, XCircle, ShoppingCart, Building2 } from "lucide-react";
import type { QuotationRequest, QuotationItem, Product, Supplier } from "@shared/schema";

interface MyQuotationsProps {
  clinicId: string;
}

interface QuotationWithDetails extends QuotationRequest {
  supplier?: Supplier;
  items?: (QuotationItem & { product?: Product })[];
}

export default function MyQuotations({ clinicId }: MyQuotationsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: quotations, isLoading } = useQuery<QuotationWithDetails[]>({
    queryKey: ["/api/clinic/quotations", clinicId],
  });

  const acceptMutation = useMutation({
    mutationFn: async (quotationId: string) => {
      return apiRequest("POST", `/api/quotations/${quotationId}/accept`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinic/quotations", clinicId] });
      queryClient.invalidateQueries({ queryKey: ["/api/clinic/orders", clinicId] });
      queryClient.invalidateQueries({ queryKey: ["/api/clinic/stats", clinicId] });
      toast({ title: "Bestellung erfolgreich aufgegeben" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (quotationId: string) => {
      return apiRequest("POST", `/api/quotations/${quotationId}/reject`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinic/quotations", clinicId] });
      queryClient.invalidateQueries({ queryKey: ["/api/clinic/stats", clinicId] });
      toast({ title: "Offerte abgelehnt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-chart-3/10 text-chart-3 border-chart-3/20"><Clock className="h-3 w-3 mr-1" />Offen</Badge>;
      case "quoted":
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20"><CheckCircle className="h-3 w-3 mr-1" />Offeriert</Badge>;
      case "accepted":
        return <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20"><CheckCircle className="h-3 w-3 mr-1" />Angenommen</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="h-3 w-3 mr-1" />Abgelehnt</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const calculateTotal = (items?: (QuotationItem & { product?: Product })[]) => {
    if (!items) return 0;
    return items.reduce((sum, item) => {
      const price = parseFloat(item.customPrice || "0");
      return sum + price * item.quantity;
    }, 0);
  };

  const pendingQuotations = quotations?.filter((q) => q.status === "pending") ?? [];
  const quotedQuotations = quotations?.filter((q) => q.status === "quoted") ?? [];
  const historyQuotations = quotations?.filter((q) => ["accepted", "rejected"].includes(q.status)) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Meine Offerten</h2>
        <p className="text-muted-foreground">Offertanfragen und Antworten verfolgen</p>
      </div>

      {/* Pending */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-chart-3" />
            Warten auf Antwort
          </CardTitle>
          <CardDescription>
            Offerten warten auf Lieferantenpreise
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : pendingQuotations.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {pendingQuotations.map((quotation) => (
                <AccordionItem key={quotation.id} value={quotation.id} className="border rounded-lg mb-2 last:mb-0">
                  <AccordionTrigger className="hover:no-underline px-4">
                    <div className="flex items-center gap-3 flex-1 pr-4">
                      <div className="h-10 w-10 rounded-full bg-chart-3/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-5 w-5 text-chart-3" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium truncate">{quotation.supplier?.name || "Unbekannter Lieferant"}</p>
                        <p className="text-sm text-muted-foreground">
                          {quotation.items?.length || 0} Artikel - Angefragt am {new Date(quotation.createdAt!).toLocaleDateString("de-CH")}
                        </p>
                      </div>
                      {getStatusBadge(quotation.status)}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {quotation.notes && (
                      <div className="p-3 rounded-lg bg-muted/30 mb-3">
                        <p className="text-sm font-medium mb-1">Notizen:</p>
                        <p className="text-sm text-muted-foreground">{quotation.notes}</p>
                      </div>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Artikel-Nr.</TableHead>
                          <TableHead>Beschreibung</TableHead>
                          <TableHead>Menge</TableHead>
                          <TableHead>Packung</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotation.items?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">{item.product?.articleNumber}</TableCell>
                            <TableCell className="max-w-xs truncate">{item.product?.description}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.product?.packQuantity}</TableCell>
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
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Keine offenen Offerten</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quoted - Ready to Accept */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Bereit zur Bestellung
          </CardTitle>
          <CardDescription>
            Offerten mit Preisen zur Prüfung bereit
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : quotedQuotations.length > 0 ? (
            <div className="space-y-4">
              {quotedQuotations.map((quotation) => {
                const total = calculateTotal(quotation.items);
                return (
                  <div key={quotation.id} className="p-4 rounded-lg border" data-testid={`quoted-${quotation.id}`}>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{quotation.supplier?.name || "Unbekannt"}</p>
                          <p className="text-sm text-muted-foreground">
                            Offeriert am {new Date(quotation.updatedAt!).toLocaleDateString("de-CH")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{total.toFixed(2)} CHF</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Artikel-Nr.</TableHead>
                          <TableHead>Beschreibung</TableHead>
                          <TableHead>Menge</TableHead>
                          <TableHead>Preis</TableHead>
                          <TableHead>Zwischensumme</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotation.items?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">{item.product?.articleNumber}</TableCell>
                            <TableCell className="max-w-xs truncate">{item.product?.description}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.customPrice ? `${item.customPrice} CHF` : "-"}</TableCell>
                            <TableCell>
                              {item.customPrice
                                ? `${(parseFloat(item.customPrice) * item.quantity).toFixed(2)} CHF`
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => rejectMutation.mutate(quotation.id)}
                        disabled={rejectMutation.isPending}
                        data-testid={`button-reject-${quotation.id}`}
                      >
                        Ablehnen
                      </Button>
                      <Button
                        onClick={() => acceptMutation.mutate(quotation.id)}
                        disabled={acceptMutation.isPending}
                        data-testid={`button-accept-${quotation.id}`}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Bestellen
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Keine Offerten zur Prüfung</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Offertverlauf
          </CardTitle>
          <CardDescription>
            Abgeschlossene Offertanfragen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
            </div>
          ) : historyQuotations.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {historyQuotations.map((quotation) => (
                <AccordionItem key={quotation.id} value={quotation.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4 flex-1 pr-4">
                      <span className="font-medium">{quotation.supplier?.name || "Unbekannt"}</span>
                      {getStatusBadge(quotation.status)}
                      <span className="text-sm text-muted-foreground ml-auto">
                        {new Date(quotation.createdAt!).toLocaleDateString("de-CH")}
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
                        {quotation.items?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">{item.product?.articleNumber}</TableCell>
                            <TableCell className="max-w-xs truncate">{item.product?.description}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.customPrice ? `${item.customPrice} CHF` : "-"}</TableCell>
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
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Noch kein Offertverlauf</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
