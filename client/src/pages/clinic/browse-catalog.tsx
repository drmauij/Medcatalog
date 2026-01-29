import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, Package, Building2, ShoppingCart, FileText, Plus, Minus } from "lucide-react";
import type { Product, Category, Supplier } from "@shared/schema";

interface BrowseCatalogProps {
  clinicId: string;
}

interface ProductWithDetails extends Product {
  category?: Category;
  supplier?: Supplier;
}

interface CartItem {
  product: ProductWithDetails;
  quantity: number;
}

export default function BrowseCatalog({ clinicId }: BrowseCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSupplier, setFilterSupplier] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isQuotationOpen, setIsQuotationOpen] = useState(false);
  const [quotationNotes, setQuotationNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery<ProductWithDetails[]>({
    queryKey: ["/api/catalog/products"],
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/catalog/suppliers"],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/catalog/categories", filterSupplier],
  });

  const createQuotationMutation = useMutation({
    mutationFn: async (data: { supplierId: string; items: { productId: string; quantity: number }[]; notes: string }) => {
      return apiRequest("POST", "/api/quotations", { ...data, clinicId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinic/quotations", clinicId] });
      queryClient.invalidateQueries({ queryKey: ["/api/clinic/stats", clinicId] });
      setCart([]);
      setIsQuotationOpen(false);
      setQuotationNotes("");
      toast({ title: "Offertanfrage erfolgreich gesendet" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const filteredProducts = products?.filter((product) => {
    const matchesSearch =
      product.articleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSupplier = filterSupplier === "all" || product.supplierId === filterSupplier;
    const matchesCategory = filterCategory === "all" || product.categoryId === filterCategory;
    return matchesSearch && matchesSupplier && matchesCategory;
  });

  const addToCart = (product: ProductWithDetails) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast({ title: "Zum Offertwarenkorb hinzugefügt" });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleRequestQuotation = () => {
    if (cart.length === 0) return;
    
    // Group items by supplier
    const itemsBySupplier = cart.reduce((acc, item) => {
      const supplierId = item.product.supplierId;
      if (!acc[supplierId]) acc[supplierId] = [];
      acc[supplierId].push({ productId: item.product.id, quantity: item.quantity });
      return acc;
    }, {} as Record<string, { productId: string; quantity: number }[]>);

    // For now, just send to first supplier (can be extended for multiple)
    const [supplierId, items] = Object.entries(itemsBySupplier)[0];
    createQuotationMutation.mutate({ supplierId, items, notes: quotationNotes });
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Katalog durchsuchen</h2>
          <p className="text-muted-foreground">Produkte finden und Offerten anfordern</p>
        </div>
        <Button
          onClick={() => setIsQuotationOpen(true)}
          disabled={cart.length === 0}
          data-testid="button-view-cart"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Offertwarenkorb ({cartTotal})
        </Button>
      </div>

      {/* Quotation Cart Dialog */}
      <Dialog open={isQuotationOpen} onOpenChange={setIsQuotationOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Offerte anfordern</DialogTitle>
            <DialogDescription>
              Artikel prüfen und Preise vom Lieferanten anfordern
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {cart.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produkt</TableHead>
                      <TableHead>Menge</TableHead>
                      <TableHead className="w-24">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.product.id}>
                        <TableCell>
                          <div>
                            <p className="font-mono text-xs text-muted-foreground">{item.product.articleNumber}</p>
                            <p className="text-sm font-medium">
                              {item.product.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Packung: {item.product.packQuantity}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateCartQuantity(item.product.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateCartQuantity(item.product.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            Entfernen
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notizen (optional)</Label>
                  <Textarea
                    id="notes"
                    value={quotationNotes}
                    onChange={(e) => setQuotationNotes(e.target.value)}
                    placeholder="Besondere Anforderungen oder Fragen..."
                    rows={3}
                    data-testid="input-quotation-notes"
                  />
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Ihr Offertwarenkorb ist leer</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuotationOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleRequestQuotation}
              disabled={cart.length === 0 || createQuotationMutation.isPending}
              data-testid="button-send-quotation-request"
            >
              {createQuotationMutation.isPending ? "Wird gesendet..." : "Offerte anfordern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Produkte suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-catalog"
          />
        </div>
        <Select value={filterSupplier} onValueChange={(val) => { setFilterSupplier(val); setFilterCategory("all"); }}>
          <SelectTrigger className="w-48" data-testid="select-filter-supplier">
            <SelectValue placeholder="Alle Lieferanten" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Lieferanten</SelectItem>
            {suppliers?.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48" data-testid="select-filter-category">
            <SelectValue placeholder="Alle Kategorien" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-12 w-full mb-3" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts && filteredProducts.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => {
              const inCart = cart.find((item) => item.product.id === product.id);
              return (
                <Card key={product.id} className="hover-elevate" data-testid={`card-product-${product.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-mono text-xs text-muted-foreground">{product.articleNumber}</p>
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        <Building2 className="h-3 w-3 mr-1" />
                        {product.supplier?.name || "Unbekannt"}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium line-clamp-2">
                      {product.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {product.category?.name || "Unbekannt"}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        Packung: {product.packQuantity}
                        {product.defaultPrice && (
                          <span className="ml-2 font-medium text-foreground">
                            ~{product.defaultPrice} CHF
                          </span>
                        )}
                      </div>
                      {inCart ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateCartQuantity(product.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">{inCart.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateCartQuantity(product.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => addToCart(product)}
                          data-testid={`button-add-${product.id}`}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Hinzufügen
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Keine Produkte gefunden</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || filterSupplier !== "all" || filterCategory !== "all"
                    ? "Versuchen Sie, die Filter anzupassen"
                    : "Produkte erscheinen hier, sobald Lieferanten sie hinzufügen"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
