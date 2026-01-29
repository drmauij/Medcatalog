import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Package, Search, Upload } from "lucide-react";
import type { Product, Category } from "@shared/schema";

interface ProductsPageProps {
  supplierId: string;
}

interface ProductWithCategory extends Product {
  category?: Category;
}

export default function ProductsPage({ supplierId }: ProductsPageProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importData, setImportData] = useState("");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [formData, setFormData] = useState({
    articleNumber: "",
    description: "",
    packQuantity: 1,
    categoryId: "",
    defaultPrice: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery<ProductWithCategory[]>({
    queryKey: ["/api/products", supplierId],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories", supplierId],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/products", {
        ...data,
        supplierId,
        packQuantity: Number(data.packQuantity),
        defaultPrice: data.defaultPrice ? data.defaultPrice : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", supplierId] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier/stats", supplierId] });
      setIsAddOpen(false);
      resetForm();
      toast({ title: "Produkt erfolgreich erstellt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return apiRequest("PATCH", `/api/products/${id}`, {
        ...data,
        packQuantity: Number(data.packQuantity),
        defaultPrice: data.defaultPrice ? data.defaultPrice : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", supplierId] });
      setEditProduct(null);
      resetForm();
      toast({ title: "Produkt erfolgreich aktualisiert" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/products/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", supplierId] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier/stats", supplierId] });
      toast({ title: "Produkt erfolgreich gelöscht" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (products: { categoryName: string; articleNumber: string; description: string; packQuantity: number; defaultPrice?: string }[]) => {
      const response = await apiRequest("POST", "/api/products/import", { supplierId, products });
      return response.json() as Promise<{ created: number; errors: number; categoriesCreated: number; newCategories: string[] }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", supplierId] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories", supplierId] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier/stats", supplierId] });
      setIsImportOpen(false);
      setImportData("");
      const parts = [`${data.created} Produkte importiert`];
      if (data.categoriesCreated > 0) {
        parts.push(`${data.categoriesCreated} neue Kategorien erstellt`);
      }
      if (data.errors > 0) {
        parts.push(`${data.errors} Fehler`);
      }
      toast({ 
        title: `Import abgeschlossen`, 
        description: parts.join(", ")
      });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const parseImportData = (text: string) => {
    const lines = text.trim().split("\n").filter(line => line.trim());
    const products: { categoryName: string; articleNumber: string; description: string; packQuantity: number; defaultPrice?: string }[] = [];
    
    for (const line of lines) {
      // Skip header line
      if (line.toLowerCase().includes("artikelnummer") && line.toLowerCase().includes("beschreibung")) {
        continue;
      }
      
      // Try tab-separated first, then semicolon, then comma
      let parts = line.split("\t");
      if (parts.length < 3) {
        parts = line.split(";");
      }
      if (parts.length < 3) {
        parts = line.split(",");
      }
      
      // Format: Category | Artikelnummer | Beschreibung | VE (PackQuantity)
      if (parts.length >= 3) {
        const categoryName = parts[0]?.trim();
        const articleNumber = parts[1]?.trim();
        const description = parts[2]?.trim();
        const packQuantity = parts[3] ? parseInt(parts[3].trim()) || 1 : 1;
        
        if (categoryName && articleNumber && description) {
          products.push({ categoryName, articleNumber, description, packQuantity });
        }
      }
    }
    
    return products;
  };
  
  const getUniqueCategoriesFromImport = (text: string) => {
    const products = parseImportData(text);
    const categories = new Set(products.map(p => p.categoryName));
    return Array.from(categories);
  };

  const handleImport = () => {
    if (!importData.trim()) {
      toast({ title: "Bitte Katalogdaten einfügen", variant: "destructive" });
      return;
    }
    const products = parseImportData(importData);
    if (products.length === 0) {
      toast({ title: "Keine gültigen Produkte gefunden", variant: "destructive" });
      return;
    }
    importMutation.mutate(products);
  };

  const resetForm = () => {
    setFormData({
      articleNumber: "",
      description: "",
      packQuantity: 1,
      categoryId: "",
      defaultPrice: "",
    });
  };

  const openEditDialog = (product: Product) => {
    setEditProduct(product);
    setFormData({
      articleNumber: product.articleNumber,
      description: product.description,
      packQuantity: product.packQuantity,
      categoryId: product.categoryId,
      defaultPrice: product.defaultPrice ?? "",
    });
  };

  const handleSubmit = () => {
    if (!formData.articleNumber.trim() || !formData.description.trim() || !formData.categoryId) {
      toast({ title: "Bitte füllen Sie alle Pflichtfelder aus", variant: "destructive" });
      return;
    }
    if (editProduct) {
      updateMutation.mutate({ id: editProduct.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredProducts = products?.filter((product) => {
    const matchesSearch =
      product.articleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || product.categoryId === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryName = (categoryId: string) => {
    return categories?.find((c) => c.id === categoryId)?.name ?? "Unbekannt";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Produkte</h2>
          <p className="text-muted-foreground">Verwalten Sie Ihren Produktkatalog</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)} data-testid="button-import-products">
            <Upload className="h-4 w-4 mr-2" />
            Importieren
          </Button>
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-product">
                <Plus className="h-4 w-4 mr-2" />
                Produkt hinzufügen
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Produkt hinzufügen</DialogTitle>
              <DialogDescription>
                Fügen Sie ein neues Produkt zu Ihrem Katalog hinzu
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="articleNumber">Artikelnummer *</Label>
                  <Input
                    id="articleNumber"
                    value={formData.articleNumber}
                    onChange={(e) => setFormData({ ...formData, articleNumber: e.target.value })}
                    placeholder="z.B. Q112218N-IGS"
                    data-testid="input-article-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="packQuantity">Packungsmenge *</Label>
                  <Input
                    id="packQuantity"
                    type="number"
                    min={1}
                    value={formData.packQuantity}
                    onChange={(e) => setFormData({ ...formData, packQuantity: parseInt(e.target.value) || 1 })}
                    data-testid="input-pack-quantity"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Kategorie *</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                >
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Kategorie auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Produktbeschreibung..."
                  rows={3}
                  data-testid="input-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultPrice">Standardpreis Netto (optional)</Label>
                <Input
                  id="defaultPrice"
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.defaultPrice}
                  onChange={(e) => setFormData({ ...formData, defaultPrice: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-default-price"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>
                Abbrechen
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                data-testid="button-save-product"
              >
                {createMutation.isPending ? "Wird erstellt..." : "Erstellen"}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={(open) => {
        setIsImportOpen(open);
        if (!open) {
          setImportData("");
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Produkte importieren</DialogTitle>
            <DialogDescription>
              Fügen Sie Ihre Katalogdaten ein. Fehlende Kategorien werden automatisch erstellt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="importData">Katalogdaten</Label>
              <div className="text-xs text-muted-foreground mb-2">
                Format: Kategorie | Artikelnummer | Beschreibung | VE (Packungsmenge)
              </div>
              <Textarea
                id="importData"
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder={`Airwaymanagement\tQ112218N-IGS\tQ-Tube Beatmungsschlauch-Set\t30\nMonitoring\tABC123\tAnderes Produkt\t1`}
                rows={12}
                className="font-mono text-sm"
                data-testid="textarea-import-data"
              />
            </div>
            {importData && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium">Vorschau</p>
                <p className="text-xs text-muted-foreground">
                  {parseImportData(importData).length} Produkte erkannt
                </p>
                {getUniqueCategoriesFromImport(importData).length > 0 && (
                  <div className="text-xs">
                    <span className="font-medium">Kategorien: </span>
                    <span className="text-muted-foreground">
                      {getUniqueCategoriesFromImport(importData).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsImportOpen(false);
              setImportData("");
            }}>
              Abbrechen
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importData.trim() || importMutation.isPending}
              data-testid="button-execute-import"
            >
              {importMutation.isPending ? "Wird importiert..." : "Importieren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editProduct} onOpenChange={(open) => { if (!open) { setEditProduct(null); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Produkt bearbeiten</DialogTitle>
            <DialogDescription>
              Produktdetails aktualisieren
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-articleNumber">Artikelnummer *</Label>
                <Input
                  id="edit-articleNumber"
                  value={formData.articleNumber}
                  onChange={(e) => setFormData({ ...formData, articleNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-packQuantity">Packungsmenge *</Label>
                <Input
                  id="edit-packQuantity"
                  type="number"
                  min={1}
                  value={formData.packQuantity}
                  onChange={(e) => setFormData({ ...formData, packQuantity: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-categoryId">Kategorie *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategorie auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Beschreibung *</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-defaultPrice">Standardpreis Netto (optional)</Label>
              <Input
                id="edit-defaultPrice"
                type="number"
                step="0.01"
                min={0}
                value={formData.defaultPrice}
                onChange={(e) => setFormData({ ...formData, defaultPrice: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditProduct(null); resetForm(); }}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Wird gespeichert..." : "Speichern"}
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
            data-testid="input-search-products"
          />
        </div>
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

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produkte
          </CardTitle>
          <CardDescription>
            {filteredProducts?.length ?? 0} Produkte
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artikel-Nr.</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Packung</TableHead>
                    <TableHead>Preis (Netto)</TableHead>
                    <TableHead className="w-24">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                      <TableCell className="font-mono text-sm">{product.articleNumber}</TableCell>
                      <TableCell className="max-w-xs truncate">{product.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getCategoryName(product.categoryId)}</Badge>
                      </TableCell>
                      <TableCell>{product.packQuantity}</TableCell>
                      <TableCell>
                        {product.defaultPrice ? (
                          <span className="font-medium" title="Netto, zzgl. MwSt.">{product.defaultPrice} CHF</span>
                        ) : (
                          <span className="text-muted-foreground">Nicht gesetzt</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(product.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Keine Produkte gefunden</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || filterCategory !== "all"
                  ? "Versuchen Sie, die Filter anzupassen"
                  : "Fügen Sie Ihr erstes Produkt hinzu, um zu beginnen"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
