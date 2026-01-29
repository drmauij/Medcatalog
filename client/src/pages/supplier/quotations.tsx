import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { FileText, Clock, CheckCircle, XCircle, Building2, Save } from "lucide-react";
import { ActionHistoryFull } from "@/components/action-history";
import type { QuotationRequest, QuotationItem, Product, Clinic } from "@shared/schema";

interface QuotationsPageProps {
  supplierId: string;
}

interface UserInfo {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface LinkedOrder {
  id: string;
  status: string;
  createdAt?: string | null;
  totalAmount?: string | null;
  createdByUser?: UserInfo | null;
  confirmedByUser?: UserInfo | null;
}

interface QuotationWithDetails extends QuotationRequest {
  clinic?: Clinic;
  items?: (QuotationItem & { product?: Product })[];
  createdByUser?: UserInfo | null;
  respondedByUser?: UserInfo | null;
  linkedOrder?: LinkedOrder | null;
}

interface ItemPricing {
  catalogPrice: string;
  discount: string;
  saveAsDefault: boolean;
  originalDefaultPrice: string | null;
}

export default function QuotationsPage({ supplierId }: QuotationsPageProps) {
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationWithDetails | null>(null);
  const [itemPricing, setItemPricing] = useState<Record<string, ItemPricing>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: quotations, isLoading } = useQuery<QuotationWithDetails[]>({
    queryKey: ["/api/supplier/quotations", supplierId],
  });

  const respondMutation = useMutation({
    mutationFn: async ({ 
      quotationId, 
      items,
      updateDefaultPrices 
    }: { 
      quotationId: string; 
      items: { id: string; customPrice: string; productId: string }[];
      updateDefaultPrices: { productId: string; defaultPrice: string }[];
    }) => {
      // First update default prices if any
      for (const update of updateDefaultPrices) {
        await apiRequest("PATCH", `/api/products/${update.productId}`, { 
          defaultPrice: update.defaultPrice 
        });
      }
      // Then respond to the quotation
      return apiRequest("POST", `/api/quotations/${quotationId}/respond`, { items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier/quotations", supplierId] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier/stats", supplierId] });
      queryClient.invalidateQueries({ queryKey: ["/api/products", supplierId] });
      setSelectedQuotation(null);
      setItemPricing({});
      toast({ title: "Offerte erfolgreich gesendet" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const calculateFinalPrice = (catalogPrice: string, discount: string): string => {
    const price = parseFloat(catalogPrice) || 0;
    const discountPercent = parseFloat(discount) || 0;
    const finalPrice = price * (1 - discountPercent / 100);
    return finalPrice.toFixed(2);
  };

  const handleRespond = () => {
    if (!selectedQuotation) return;
    
    const items: { id: string; customPrice: string; productId: string }[] = [];
    const updateDefaultPrices: { productId: string; defaultPrice: string }[] = [];
    
    selectedQuotation.items?.forEach((item) => {
      const pricing = itemPricing[item.id];
      if (pricing) {
        const finalPrice = calculateFinalPrice(pricing.catalogPrice, pricing.discount);
        items.push({ 
          id: item.id, 
          customPrice: finalPrice,
          productId: item.productId
        });
        
        // Check if we need to save as new default price
        if (pricing.saveAsDefault && pricing.catalogPrice !== pricing.originalDefaultPrice) {
          updateDefaultPrices.push({
            productId: item.productId,
            defaultPrice: pricing.catalogPrice
          });
        }
      }
    });
    
    respondMutation.mutate({ quotationId: selectedQuotation.id, items, updateDefaultPrices });
  };

  const openRespondDialog = (quotation: QuotationWithDetails) => {
    setSelectedQuotation(quotation);
    const pricing: Record<string, ItemPricing> = {};
    quotation.items?.forEach((item) => {
      const defaultPrice = item.product?.defaultPrice ?? "";
      pricing[item.id] = {
        catalogPrice: defaultPrice,
        discount: "0",
        saveAsDefault: !defaultPrice, // Auto-check if no default price exists
        originalDefaultPrice: defaultPrice || null,
      };
    });
    setItemPricing(pricing);
  };

  const updateItemPricing = (itemId: string, field: keyof ItemPricing, value: string | boolean) => {
    setItemPricing((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

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

  const pendingQuotations = quotations?.filter((q) => q.status === "pending") ?? [];
  const otherQuotations = quotations?.filter((q) => q.status !== "pending") ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Offertanfragen</h2>
        <p className="text-muted-foreground">Prüfen und beantworten Sie Preisanfragen von Kliniken</p>
      </div>

      {/* Respond Dialog */}
      <Dialog open={!!selectedQuotation} onOpenChange={(open) => !open && setSelectedQuotation(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Offerte beantworten</DialogTitle>
            <DialogDescription>
              Preise für die angefragten Artikel festlegen
            </DialogDescription>
          </DialogHeader>
          {selectedQuotation && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{selectedQuotation.clinic?.name || "Unbekannte Klinik"}</p>
                  <p className="text-sm text-muted-foreground">
                    Angefragt am {new Date(selectedQuotation.createdAt!).toLocaleDateString("de-CH")}
                  </p>
                </div>
              </div>
              {selectedQuotation.notes && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm font-medium mb-1">Notizen der Klinik:</p>
                  <p className="text-sm text-muted-foreground">{selectedQuotation.notes}</p>
                </div>
              )}
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[200px]">Artikel</TableHead>
                      <TableHead className="text-center w-[60px]">Menge</TableHead>
                      <TableHead className="text-right w-[120px]">Katalogpreis</TableHead>
                      <TableHead className="text-center w-[80px]">Rabatt %</TableHead>
                      <TableHead className="text-right w-[100px]">Endpreis</TableHead>
                      <TableHead className="text-center w-[100px]">
                        <span className="flex items-center justify-center gap-1">
                          <Save className="h-3 w-3" />
                          Speichern
                        </span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedQuotation.items?.map((item) => {
                      const pricing = itemPricing[item.id];
                      const finalPrice = pricing 
                        ? calculateFinalPrice(pricing.catalogPrice, pricing.discount)
                        : "0.00";
                      const hasNoDefaultPrice = !item.product?.defaultPrice;
                      const priceChanged = pricing?.catalogPrice !== pricing?.originalDefaultPrice;
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="font-mono text-sm">{item.product?.articleNumber}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[180px]" title={item.product?.description}>
                                {item.product?.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Packung: {item.product?.packQuantity}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {item.quantity}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 justify-end">
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                value={pricing?.catalogPrice || ""}
                                onChange={(e) => updateItemPricing(item.id, "catalogPrice", e.target.value)}
                                className="w-20 text-right"
                                placeholder="0.00"
                                data-testid={`input-catalog-price-${item.id}`}
                              />
                              <span className="text-xs text-muted-foreground">CHF</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 justify-center">
                              <Input
                                type="number"
                                step="0.5"
                                min={0}
                                max={100}
                                value={pricing?.discount || "0"}
                                onChange={(e) => updateItemPricing(item.id, "discount", e.target.value)}
                                className="w-16 text-center"
                                data-testid={`input-discount-${item.id}`}
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-medium text-primary">{finalPrice} CHF</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={pricing?.saveAsDefault || false}
                                onCheckedChange={(checked) => 
                                  updateItemPricing(item.id, "saveAsDefault", !!checked)
                                }
                                disabled={!pricing?.catalogPrice || (!hasNoDefaultPrice && !priceChanged)}
                                data-testid={`checkbox-save-default-${item.id}`}
                              />
                            </div>
                            {hasNoDefaultPrice && (
                              <p className="text-xs text-chart-3 mt-1">Neu</p>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                <p className="font-medium mb-1">Hinweis:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Katalogpreis:</strong> Der Standardpreis aus Ihrem Katalog. Bearbeiten Sie ihn bei Bedarf.</li>
                  <li><strong>Rabatt:</strong> Prozentsatz für diesen Kunden (z.B. basierend auf Bestellmenge).</li>
                  <li><strong>Endpreis:</strong> Automatisch berechnet (Katalogpreis - Rabatt).</li>
                  <li><strong>Speichern:</strong> Aktivieren, um den Katalogpreis als neuen Standardpreis zu speichern.</li>
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedQuotation(null)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleRespond}
              disabled={respondMutation.isPending}
              data-testid="button-send-quotation"
            >
              {respondMutation.isPending ? "Wird gesendet..." : "Offerte senden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending Quotations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-chart-3" />
            Offene Anfragen
          </CardTitle>
          <CardDescription>
            {pendingQuotations.length} Anfrage{pendingQuotations.length !== 1 ? "n" : ""} warten auf Ihre Antwort
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : pendingQuotations.length > 0 ? (
            <div className="space-y-3">
              {pendingQuotations.map((quotation) => (
                <div
                  key={quotation.id}
                  className="p-4 rounded-lg border hover-elevate cursor-pointer"
                  onClick={() => openRespondDialog(quotation)}
                  data-testid={`quotation-${quotation.id}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-chart-3/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-chart-3" />
                      </div>
                      <div>
                        <p className="font-medium">{quotation.clinic?.name || "Unbekannte Klinik"}</p>
                        <p className="text-sm text-muted-foreground">
                          {quotation.items?.length || 0} Artikel - {new Date(quotation.createdAt!).toLocaleDateString("de-CH")}
                        </p>
                      </div>
                    </div>
                    <Button data-testid={`button-respond-${quotation.id}`}>Beantworten</Button>
                  </div>
                  {quotation.createdByUser && (
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center gap-2">
                      <span>Angefragt von:</span>
                      <span className="font-medium text-foreground">
                        {quotation.createdByUser.firstName || ""} {quotation.createdByUser.lastName || quotation.createdByUser.email || "Unbekannt"}
                      </span>
                      {quotation.createdByUser.email && (
                        <a 
                          href={`mailto:${quotation.createdByUser.email}`} 
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {quotation.createdByUser.email}
                        </a>
                      )}
                      {quotation.createdByUser.phone && (
                        <a 
                          href={`tel:${quotation.createdByUser.phone}`} 
                          className="text-muted-foreground hover:text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {quotation.createdByUser.phone}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Keine offenen Anfragen</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quotation History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Offertverlauf
          </CardTitle>
          <CardDescription>
            Bereits beantwortete Offerten
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : otherQuotations.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {otherQuotations.map((quotation) => (
                <AccordionItem key={quotation.id} value={quotation.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4 flex-1 pr-4">
                      <span className="font-medium">{quotation.clinic?.name || "Unbekannt"}</span>
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
                    <ActionHistoryFull
                      createdAt={quotation.createdAt}
                      updatedAt={quotation.updatedAt}
                      createdByUser={quotation.createdByUser}
                      respondedByUser={quotation.respondedByUser}
                      linkedOrder={quotation.linkedOrder}
                      status={quotation.status}
                    />
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
