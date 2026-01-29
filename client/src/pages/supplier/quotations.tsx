import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { FileText, Clock, CheckCircle, XCircle, Building2 } from "lucide-react";
import type { QuotationRequest, QuotationItem, Product, Clinic } from "@shared/schema";

interface QuotationsPageProps {
  supplierId: string;
}

interface QuotationWithDetails extends QuotationRequest {
  clinic?: Clinic;
  items?: (QuotationItem & { product?: Product })[];
}

export default function QuotationsPage({ supplierId }: QuotationsPageProps) {
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationWithDetails | null>(null);
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: quotations, isLoading } = useQuery<QuotationWithDetails[]>({
    queryKey: ["/api/supplier/quotations", supplierId],
  });

  const respondMutation = useMutation({
    mutationFn: async ({ quotationId, items }: { quotationId: string; items: { id: string; customPrice: string }[] }) => {
      return apiRequest("POST", `/api/quotations/${quotationId}/respond`, { items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier/quotations", supplierId] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier/stats", supplierId] });
      setSelectedQuotation(null);
      setItemPrices({});
      toast({ title: "Quotation sent successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleRespond = () => {
    if (!selectedQuotation) return;
    const items = Object.entries(itemPrices)
      .filter(([_, price]) => price)
      .map(([id, customPrice]) => ({ id, customPrice }));
    respondMutation.mutate({ quotationId: selectedQuotation.id, items });
  };

  const openRespondDialog = (quotation: QuotationWithDetails) => {
    setSelectedQuotation(quotation);
    const prices: Record<string, string> = {};
    quotation.items?.forEach((item) => {
      prices[item.id] = item.customPrice ?? item.product?.defaultPrice ?? "";
    });
    setItemPrices(prices);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-chart-3/10 text-chart-3 border-chart-3/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "quoted":
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20"><CheckCircle className="h-3 w-3 mr-1" />Quoted</Badge>;
      case "accepted":
        return <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingQuotations = quotations?.filter((q) => q.status === "pending") ?? [];
  const otherQuotations = quotations?.filter((q) => q.status !== "pending") ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Quotation Requests</h2>
        <p className="text-muted-foreground">Review and respond to pricing requests from clinics</p>
      </div>

      {/* Respond Dialog */}
      <Dialog open={!!selectedQuotation} onOpenChange={(open) => !open && setSelectedQuotation(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Respond to Quotation</DialogTitle>
            <DialogDescription>
              Set prices for the requested items
            </DialogDescription>
          </DialogHeader>
          {selectedQuotation && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{selectedQuotation.clinic?.name || "Unknown Clinic"}</p>
                  <p className="text-sm text-muted-foreground">
                    Requested on {new Date(selectedQuotation.createdAt!).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {selectedQuotation.notes && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm font-medium mb-1">Notes from clinic:</p>
                  <p className="text-sm text-muted-foreground">{selectedQuotation.notes}</p>
                </div>
              )}
              <div className="space-y-3">
                <Label>Items & Pricing</Label>
                {selectedQuotation.items?.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm">{item.product?.articleNumber}</p>
                      <p className="text-sm text-muted-foreground truncate">{item.product?.description}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Qty: {item.quantity}</span>
                        <span>Pack: {item.product?.packQuantity}</span>
                        {item.product?.defaultPrice && (
                          <span>Default: {item.product.defaultPrice} CHF</span>
                        )}
                      </div>
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={itemPrices[item.id] || ""}
                        onChange={(e) => setItemPrices({ ...itemPrices, [item.id]: e.target.value })}
                        placeholder="Price"
                        data-testid={`input-price-${item.id}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedQuotation(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleRespond}
              disabled={respondMutation.isPending}
              data-testid="button-send-quotation"
            >
              {respondMutation.isPending ? "Sending..." : "Send Quotation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending Quotations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-chart-3" />
            Pending Requests
          </CardTitle>
          <CardDescription>
            {pendingQuotations.length} request{pendingQuotations.length !== 1 ? "s" : ""} awaiting your response
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
                  className="flex items-center justify-between gap-4 p-4 rounded-lg border hover-elevate cursor-pointer"
                  onClick={() => openRespondDialog(quotation)}
                  data-testid={`quotation-${quotation.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-chart-3/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-chart-3" />
                    </div>
                    <div>
                      <p className="font-medium">{quotation.clinic?.name || "Unknown Clinic"}</p>
                      <p className="text-sm text-muted-foreground">
                        {quotation.items?.length || 0} items - {new Date(quotation.createdAt!).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button data-testid={`button-respond-${quotation.id}`}>Respond</Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No pending requests</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quotation History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quotation History
          </CardTitle>
          <CardDescription>
            Previously responded quotations
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
                      <span className="font-medium">{quotation.clinic?.name || "Unknown"}</span>
                      {getStatusBadge(quotation.status)}
                      <span className="text-sm text-muted-foreground ml-auto">
                        {new Date(quotation.createdAt!).toLocaleDateString()}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Article #</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Price</TableHead>
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
              <p className="text-muted-foreground">No quotation history yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
