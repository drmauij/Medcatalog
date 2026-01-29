import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  await setupAuth(app);
  registerAuthRoutes(app);

  // Helper to get user ID from request
  const getUserId = (req: Request): string | null => {
    return (req.user as any)?.claims?.sub || null;
  };

  // Helper to verify supplier ownership (supports multi-role)
  const verifySupplierAccess = async (req: Request, supplierId: string): Promise<boolean> => {
    const userId = getUserId(req);
    if (!userId) return false;
    const role = await storage.getUserRoleByEntityId(userId, "supplier", supplierId);
    return !!role;
  };

  // Helper to verify clinic ownership (supports multi-role)
  const verifyClinicAccess = async (req: Request, clinicId: string): Promise<boolean> => {
    const userId = getUserId(req);
    if (!userId) return false;
    const role = await storage.getUserRoleByEntityId(userId, "clinic", clinicId);
    return !!role;
  };

  // ============================================
  // User Role Routes
  // ============================================

  // Get current user's primary role (first role)
  app.get("/api/user/role", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const role = await storage.getUserRole(userId);
      if (!role) return res.json(null);

      if (role.role === "supplier") {
        const supplier = await storage.getSupplier(role.entityId);
        return res.json({ role, supplier });
      } else if (role.role === "clinic") {
        const clinic = await storage.getClinic(role.entityId);
        return res.json({ role, clinic });
      }

      return res.json(null);
    } catch (error) {
      console.error("Error getting user role:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all user roles (for multi-role support)
  app.get("/api/user/roles", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const roles = await storage.getUserRoles(userId);
      
      // Enrich roles with entity details
      const enrichedRoles = await Promise.all(roles.map(async (role) => {
        if (role.role === "supplier") {
          const supplier = await storage.getSupplier(role.entityId);
          return { role, supplier, clinic: null };
        } else if (role.role === "clinic") {
          const clinic = await storage.getClinic(role.entityId);
          return { role, clinic, supplier: null };
        }
        return { role, supplier: null, clinic: null };
      }));

      return res.json(enrichedRoles);
    } catch (error) {
      console.error("Error getting user roles:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create user role (register as supplier or clinic)
  app.post("/api/user/role", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { role, name } = req.body;
      if (!role || !name) {
        return res.status(400).json({ error: "Role and name are required" });
      }

      // Check if user already has this specific role type
      const existingRoles = await storage.getUserRoles(userId);
      const hasThisRoleType = existingRoles.some(r => r.role === role);
      if (hasThisRoleType) {
        return res.status(400).json({ error: `User already has a ${role} role` });
      }

      let entityId: string;

      if (role === "supplier") {
        const supplier = await storage.createSupplier({ name, userId });
        entityId = supplier.id;
      } else if (role === "clinic") {
        const clinic = await storage.createClinic({ name, userId });
        entityId = clinic.id;
      } else {
        return res.status(400).json({ error: "Invalid role" });
      }

      const userRole = await storage.createUserRole({ userId, role, entityId });
      res.json(userRole);
    } catch (error) {
      console.error("Error creating user role:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // Supplier Stats
  // ============================================

  app.get("/api/supplier/stats/:supplierId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { supplierId } = req.params;
      
      if (!await verifySupplierAccess(req, supplierId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const categoriesData = await storage.getCategoriesBySupplierId(supplierId);
      const productsData = await storage.getProductsBySupplierId(supplierId);
      const quotationsData = await storage.getQuotationsBySupplierId(supplierId);
      const ordersData = await storage.getOrdersBySupplierId(supplierId);

      res.json({
        categories: categoriesData.length,
        products: productsData.filter(p => p.isActive).length,
        pendingQuotations: quotationsData.filter(q => q.status === "pending").length,
        pendingOrders: ordersData.filter(o => o.status === "pending").length,
      });
    } catch (error) {
      console.error("Error getting supplier stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // Clinic Management
  // ============================================

  // Get clinic by ID
  app.get("/api/clinics/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!await verifyClinicAccess(req, id)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const clinic = await storage.getClinic(id);
      if (!clinic) {
        return res.status(404).json({ error: "Clinic not found" });
      }
      
      res.json(clinic);
    } catch (error) {
      console.error("Error getting clinic:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update clinic
  app.patch("/api/clinics/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!await verifyClinicAccess(req, id)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const { name, email, phone } = req.body;
      
      // Validate that at least one field is provided
      if (!name && email === undefined && phone === undefined) {
        return res.status(400).json({ error: "No fields to update" });
      }
      
      const updateData: { name?: string; email?: string; phone?: string } = {};
      if (name) updateData.name = name;
      if (email !== undefined) updateData.email = email || null;
      if (phone !== undefined) updateData.phone = phone || null;
      
      const clinic = await storage.updateClinic(id, updateData);
      if (!clinic) {
        return res.status(404).json({ error: "Clinic not found" });
      }
      
      res.json(clinic);
    } catch (error) {
      console.error("Error updating clinic:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // Clinic Stats
  // ============================================

  app.get("/api/clinic/stats/:clinicId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { clinicId } = req.params;
      
      if (!await verifyClinicAccess(req, clinicId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const quotationsData = await storage.getQuotationsByClinicId(clinicId);
      const ordersData = await storage.getOrdersByClinicId(clinicId);

      res.json({
        pendingQuotations: quotationsData.filter(q => q.status === "pending").length,
        activeOrders: ordersData.filter(o => ["pending", "confirmed", "shipped"].includes(o.status)).length,
        totalOrders: ordersData.length,
      });
    } catch (error) {
      console.error("Error getting clinic stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // Categories Routes
  // ============================================

  // Get categories by supplier
  app.get("/api/categories/:supplierId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { supplierId } = req.params;
      
      if (!await verifySupplierAccess(req, supplierId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const categoriesData = await storage.getCategoriesBySupplierId(supplierId);
      res.json(categoriesData);
    } catch (error) {
      console.error("Error getting categories:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create category
  app.post("/api/categories", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { name, supplierId } = req.body;
      if (!name || !supplierId) {
        return res.status(400).json({ error: "Name and supplierId are required" });
      }
      
      if (!await verifySupplierAccess(req, supplierId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const category = await storage.createCategory({ name, supplierId });
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update category
  app.patch("/api/categories/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }
      
      // Verify ownership through category lookup
      const existingCategory = await storage.getCategory(id);
      if (!existingCategory) {
        return res.status(404).json({ error: "Category not found" });
      }
      if (!await verifySupplierAccess(req, existingCategory.supplierId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const category = await storage.updateCategory(id, name);
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete category
  app.delete("/api/categories/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Verify ownership through category lookup
      const existingCategory = await storage.getCategory(id);
      if (!existingCategory) {
        return res.status(404).json({ error: "Category not found" });
      }
      if (!await verifySupplierAccess(req, existingCategory.supplierId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      await storage.deleteCategory(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // Products Routes
  // ============================================

  // Get products by supplier
  app.get("/api/products/:supplierId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { supplierId } = req.params;
      
      if (!await verifySupplierAccess(req, supplierId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const productsData = await storage.getProductsBySupplierId(supplierId);
      res.json(productsData.filter(p => p.isActive));
    } catch (error) {
      console.error("Error getting products:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create product
  app.post("/api/products", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { articleNumber, description, packQuantity, categoryId, supplierId, defaultPrice } = req.body;
      if (!articleNumber || !description || !packQuantity || !categoryId || !supplierId) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      if (!await verifySupplierAccess(req, supplierId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const product = await storage.createProduct({
        articleNumber,
        description,
        packQuantity,
        categoryId,
        supplierId,
        defaultPrice: defaultPrice || null,
        isActive: true,
      });
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Bulk import products with auto-category creation
  app.post("/api/products/import", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { supplierId, products: productsData } = req.body;
      if (!supplierId || !productsData || !Array.isArray(productsData)) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      if (!await verifySupplierAccess(req, supplierId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      // Get existing categories for this supplier
      const existingCategories = await storage.getCategoriesBySupplierId(supplierId);
      const categoryMap = new Map<string, string>(); // name -> id
      for (const cat of existingCategories) {
        categoryMap.set(cat.name.toLowerCase(), cat.id);
      }
      
      const created = [];
      const errors = [];
      const createdCategories: string[] = [];
      
      for (const item of productsData) {
        try {
          const { articleNumber, description, packQuantity, categoryName, defaultPrice } = item;
          if (!articleNumber || !description || !categoryName) {
            errors.push({ articleNumber: articleNumber || "unknown", error: "Missing required fields" });
            continue;
          }
          
          // Find or create category
          let categoryId = categoryMap.get(categoryName.toLowerCase());
          if (!categoryId) {
            // Create new category
            const newCategory = await storage.createCategory({
              name: categoryName,
              supplierId,
            });
            categoryId = newCategory.id;
            categoryMap.set(categoryName.toLowerCase(), categoryId);
            createdCategories.push(categoryName);
          }
          
          const product = await storage.createProduct({
            articleNumber,
            description,
            packQuantity: packQuantity || 1,
            categoryId,
            supplierId,
            defaultPrice: defaultPrice || null,
            isActive: true,
          });
          created.push(product);
        } catch (itemError: any) {
          errors.push({ articleNumber: item.articleNumber || "unknown", error: itemError.message });
        }
      }
      
      res.json({ 
        created: created.length, 
        errors: errors.length, 
        categoriesCreated: createdCategories.length,
        newCategories: createdCategories,
        errorDetails: errors 
      });
    } catch (error) {
      console.error("Error importing products:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update product
  app.patch("/api/products/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { articleNumber, description, packQuantity, categoryId, defaultPrice } = req.body;
      
      // Verify ownership through product lookup
      const existingProduct = await storage.getProduct(id);
      if (!existingProduct) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (!await verifySupplierAccess(req, existingProduct.supplierId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const product = await storage.updateProduct(id, {
        articleNumber,
        description,
        packQuantity,
        categoryId,
        defaultPrice: defaultPrice || null,
      });
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete product (soft delete)
  app.delete("/api/products/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Verify ownership through product lookup
      const existingProduct = await storage.getProduct(id);
      if (!existingProduct) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (!await verifySupplierAccess(req, existingProduct.supplierId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      await storage.deleteProduct(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // Catalog Routes (for clinics browsing)
  // ============================================

  // Get all suppliers
  app.get("/api/catalog/suppliers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const suppliersData = await storage.getAllSuppliers();
      res.json(suppliersData);
    } catch (error) {
      console.error("Error getting suppliers:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all categories (optionally filtered by supplier)
  app.get("/api/catalog/categories", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const categoriesData = await storage.getAllCategories();
      res.json(categoriesData);
    } catch (error) {
      console.error("Error getting catalog categories:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get categories filtered by supplier
  app.get("/api/catalog/categories/:supplierId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { supplierId } = req.params;
      let categoriesData;
      if (supplierId && supplierId !== "all") {
        categoriesData = await storage.getCategoriesBySupplierId(supplierId);
      } else {
        categoriesData = await storage.getAllCategories();
      }
      res.json(categoriesData);
    } catch (error) {
      console.error("Error getting catalog categories:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all products with supplier and category info
  app.get("/api/catalog/products", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const productsData = await storage.getAllProducts();
      const suppliersData = await storage.getAllSuppliers();
      const categoriesData = await storage.getAllCategories();

      const suppliersMap = new Map(suppliersData.map(s => [s.id, s]));
      const categoriesMap = new Map(categoriesData.map(c => [c.id, c]));

      const enrichedProducts = productsData.map(p => ({
        ...p,
        supplier: suppliersMap.get(p.supplierId),
        category: categoriesMap.get(p.categoryId),
      }));

      res.json(enrichedProducts);
    } catch (error) {
      console.error("Error getting catalog products:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // Quotation Routes
  // ============================================

  // Get quotations for supplier
  app.get("/api/supplier/quotations/:supplierId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { supplierId } = req.params;
      
      if (!await verifySupplierAccess(req, supplierId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const quotationsData = await storage.getQuotationsBySupplierId(supplierId);
      
      // Enrich with clinic info and items
      const enrichedQuotations = await Promise.all(
        quotationsData.map(async (q) => {
          const clinic = await storage.getClinic(q.clinicId);
          const items = await storage.getQuotationItems(q.id);
          const productsData = await Promise.all(
            items.map(async (item) => {
              const product = await storage.getProduct(item.productId);
              return { ...item, product };
            })
          );
          return { ...q, clinic, items: productsData };
        })
      );

      res.json(enrichedQuotations);
    } catch (error) {
      console.error("Error getting supplier quotations:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get quotations for clinic
  app.get("/api/clinic/quotations/:clinicId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { clinicId } = req.params;
      
      if (!await verifyClinicAccess(req, clinicId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const quotationsData = await storage.getQuotationsByClinicId(clinicId);
      
      // Enrich with supplier info and items
      const enrichedQuotations = await Promise.all(
        quotationsData.map(async (q) => {
          const supplier = await storage.getSupplier(q.supplierId);
          const items = await storage.getQuotationItems(q.id);
          const productsData = await Promise.all(
            items.map(async (item) => {
              const product = await storage.getProduct(item.productId);
              return { ...item, product };
            })
          );
          return { ...q, supplier, items: productsData };
        })
      );

      res.json(enrichedQuotations);
    } catch (error) {
      console.error("Error getting clinic quotations:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create quotation request (from clinic)
  app.post("/api/quotations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { clinicId, supplierId, items, notes } = req.body;
      if (!clinicId || !supplierId || !items || items.length === 0) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!await verifyClinicAccess(req, clinicId)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const quotation = await storage.createQuotationRequest({
        clinicId,
        supplierId,
        status: "pending",
        notes: notes || null,
      });

      // Create quotation items
      await Promise.all(
        items.map((item: { productId: string; quantity: number }) =>
          storage.createQuotationItem({
            quotationId: quotation.id,
            productId: item.productId,
            quantity: item.quantity,
          })
        )
      );

      res.json(quotation);
    } catch (error) {
      console.error("Error creating quotation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Supplier responds to quotation with pricing
  app.post("/api/quotations/:id/respond", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { items } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ error: "Items with prices are required" });
      }

      // Verify supplier ownership
      const quotation = await storage.getQuotationRequest(id);
      if (!quotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }
      if (!await verifySupplierAccess(req, quotation.supplierId)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Update item prices
      await Promise.all(
        items.map((item: { id: string; customPrice: string }) =>
          storage.updateQuotationItemPrice(item.id, item.customPrice)
        )
      );

      // Update quotation status
      const updatedQuotation = await storage.updateQuotationStatus(id, "quoted");
      res.json(updatedQuotation);
    } catch (error) {
      console.error("Error responding to quotation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Clinic accepts quotation -> creates order
  app.post("/api/quotations/:id/accept", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const quotation = await storage.getQuotationRequest(id);
      if (!quotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }
      
      if (!await verifyClinicAccess(req, quotation.clinicId)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const items = await storage.getQuotationItems(id);
      
      // Calculate total
      let total = 0;
      const itemsWithPrices = await Promise.all(
        items.map(async (item) => {
          const price = parseFloat(item.customPrice || "0");
          total += price * item.quantity;
          return { ...item, price };
        })
      );

      // Create order
      const order = await storage.createOrder({
        clinicId: quotation.clinicId,
        supplierId: quotation.supplierId,
        quotationId: quotation.id,
        status: "pending",
        totalAmount: total.toFixed(2),
      });

      // Create order items
      await Promise.all(
        itemsWithPrices.map((item) =>
          storage.createOrderItem({
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price.toFixed(2),
          })
        )
      );

      // Update quotation status
      await storage.updateQuotationStatus(id, "accepted");

      res.json(order);
    } catch (error) {
      console.error("Error accepting quotation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Clinic rejects quotation
  app.post("/api/quotations/:id/reject", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const existingQuotation = await storage.getQuotationRequest(id);
      if (!existingQuotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }
      if (!await verifyClinicAccess(req, existingQuotation.clinicId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const quotation = await storage.updateQuotationStatus(id, "rejected");
      res.json(quotation);
    } catch (error) {
      console.error("Error rejecting quotation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // Order Routes
  // ============================================

  // Get orders for supplier
  app.get("/api/supplier/orders/:supplierId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { supplierId } = req.params;
      
      if (!await verifySupplierAccess(req, supplierId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const ordersData = await storage.getOrdersBySupplierId(supplierId);
      
      // Enrich with clinic info and items
      const enrichedOrders = await Promise.all(
        ordersData.map(async (o) => {
          const clinic = await storage.getClinic(o.clinicId);
          const items = await storage.getOrderItems(o.id);
          const productsData = await Promise.all(
            items.map(async (item) => {
              const product = await storage.getProduct(item.productId);
              return { ...item, product };
            })
          );
          return { ...o, clinic, items: productsData };
        })
      );

      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error getting supplier orders:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get orders for clinic
  app.get("/api/clinic/orders/:clinicId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { clinicId } = req.params;
      
      if (!await verifyClinicAccess(req, clinicId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const ordersData = await storage.getOrdersByClinicId(clinicId);
      
      // Enrich with supplier info and items
      const enrichedOrders = await Promise.all(
        ordersData.map(async (o) => {
          const supplier = await storage.getSupplier(o.supplierId);
          const items = await storage.getOrderItems(o.id);
          const productsData = await Promise.all(
            items.map(async (item) => {
              const product = await storage.getProduct(item.productId);
              return { ...item, product };
            })
          );
          return { ...o, supplier, items: productsData };
        })
      );

      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error getting clinic orders:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update order status (supplier)
  app.patch("/api/orders/:id/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      
      // Verify supplier ownership
      const existingOrder = await storage.getOrder(id);
      if (!existingOrder) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (!await verifySupplierAccess(req, existingOrder.supplierId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const order = await storage.updateOrderStatus(id, status);
      res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // Supplier Invitations Routes
  // ============================================

  // Get invitations for a supplier
  app.get("/api/invitations/supplier/:supplierId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { supplierId } = req.params;
      if (!await verifySupplierAccess(req, supplierId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const invitations = await storage.getInvitationsBySupplierId(supplierId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create invitation (invite coworker)
  app.post("/api/invitations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { supplierId, email } = req.body;
      if (!supplierId || !email) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      if (!await verifySupplierAccess(req, supplierId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      // Generate token and expiry
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
      
      const invitation = await storage.createInvitation({
        supplierId,
        email,
        token,
        invitedBy: userId,
        status: "pending",
        expiresAt,
      });
      
      // Send invitation email
      const supplier = await storage.getSupplier(supplierId);
      const user = (req.user as any)?.claims;
      const inviterName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.email || "Ein Teammitglied";
      
      try {
        const { sendInvitationEmail } = await import("./email");
        await sendInvitationEmail(email, supplier?.name || "Lieferant", inviterName, token);
      } catch (emailError) {
        console.error("Error sending invitation email:", emailError);
        // Still return success - invitation created but email failed
      }
      
      res.status(201).json(invitation);
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Accept invitation (public - no auth required initially)
  app.get("/api/invitations/token/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const invitation = await storage.getInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ error: "Einladung nicht gefunden" });
      }
      
      if (invitation.status !== "pending") {
        return res.status(400).json({ error: "Einladung bereits verwendet oder abgelaufen" });
      }
      
      if (new Date(invitation.expiresAt) < new Date()) {
        await storage.updateInvitationStatus(invitation.id, "expired");
        return res.status(400).json({ error: "Einladung abgelaufen" });
      }
      
      const supplier = await storage.getSupplier(invitation.supplierId);
      res.json({ invitation, supplier });
    } catch (error) {
      console.error("Error fetching invitation by token:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Accept invitation (authenticated user joins supplier)
  app.post("/api/invitations/accept/:token", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const invitation = await storage.getInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ error: "Einladung nicht gefunden" });
      }
      
      if (invitation.status !== "pending") {
        return res.status(400).json({ error: "Einladung bereits verwendet oder abgelaufen" });
      }
      
      if (new Date(invitation.expiresAt) < new Date()) {
        await storage.updateInvitationStatus(invitation.id, "expired");
        return res.status(400).json({ error: "Einladung abgelaufen" });
      }
      
      // Check if user already has a role
      const existingRole = await storage.getUserRole(userId);
      if (existingRole) {
        return res.status(400).json({ error: "Sie haben bereits eine Rolle in der Anwendung" });
      }
      
      // Create user role as supplier team member
      await storage.createUserRole({
        userId,
        role: "supplier",
        entityId: invitation.supplierId,
      });
      
      // Mark invitation as accepted
      await storage.updateInvitationStatus(invitation.id, "accepted");
      
      res.json({ success: true, message: "Einladung angenommen" });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete/cancel invitation
  app.delete("/api/invitations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const invitation = await storage.getInvitation(id);
      
      if (!invitation) {
        return res.status(404).json({ error: "Einladung nicht gefunden" });
      }
      
      if (!await verifySupplierAccess(req, invitation.supplierId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      await storage.updateInvitationStatus(id, "cancelled");
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting invitation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // Clinic Invitations Routes
  // ============================================

  // Get invitations for a clinic
  app.get("/api/clinic-invitations/clinic/:clinicId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { clinicId } = req.params;
      if (!await verifyClinicAccess(req, clinicId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const invitations = await storage.getInvitationsByClinicId(clinicId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching clinic invitations:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create clinic invitation (invite coworker)
  app.post("/api/clinic-invitations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { clinicId, email } = req.body;
      if (!clinicId || !email) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      if (!await verifyClinicAccess(req, clinicId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      // Generate token and expiry
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
      
      const invitation = await storage.createClinicInvitation({
        clinicId,
        email,
        token,
        invitedBy: userId,
        status: "pending",
        expiresAt,
      });
      
      // Send invitation email
      const clinic = await storage.getClinic(clinicId);
      const user = (req.user as any)?.claims;
      const inviterName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.email || "Ein Teammitglied";
      
      try {
        const { sendClinicInvitationEmail } = await import("./email");
        await sendClinicInvitationEmail(email, clinic?.name || "Klinik", inviterName, token);
      } catch (emailError) {
        console.error("Error sending clinic invitation email:", emailError);
        // Still return success - invitation created but email failed
      }
      
      res.status(201).json(invitation);
    } catch (error) {
      console.error("Error creating clinic invitation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get clinic invitation by token (public - no auth required initially)
  app.get("/api/clinic-invitations/token/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const invitation = await storage.getClinicInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ error: "Einladung nicht gefunden" });
      }
      
      if (invitation.status !== "pending") {
        return res.status(400).json({ error: "Einladung bereits verwendet oder abgelaufen" });
      }
      
      if (new Date(invitation.expiresAt) < new Date()) {
        await storage.updateClinicInvitationStatus(invitation.id, "expired");
        return res.status(400).json({ error: "Einladung abgelaufen" });
      }
      
      const clinic = await storage.getClinic(invitation.clinicId);
      res.json({ invitation, clinic });
    } catch (error) {
      console.error("Error fetching clinic invitation by token:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Accept clinic invitation (authenticated user joins clinic)
  app.post("/api/clinic-invitations/accept/:token", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const invitation = await storage.getClinicInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ error: "Einladung nicht gefunden" });
      }
      
      if (invitation.status !== "pending") {
        return res.status(400).json({ error: "Einladung bereits verwendet oder abgelaufen" });
      }
      
      if (new Date(invitation.expiresAt) < new Date()) {
        await storage.updateClinicInvitationStatus(invitation.id, "expired");
        return res.status(400).json({ error: "Einladung abgelaufen" });
      }
      
      // Check if user already has a clinic role
      const existingClinicRole = await storage.getUserRoleByEntityId(userId, "clinic", invitation.clinicId);
      if (existingClinicRole) {
        return res.status(400).json({ error: "Sie sind bereits Mitglied dieser Klinik" });
      }
      
      // Create user role as clinic team member
      await storage.createUserRole({
        userId,
        role: "clinic",
        entityId: invitation.clinicId,
      });
      
      // Mark invitation as accepted
      await storage.updateClinicInvitationStatus(invitation.id, "accepted");
      
      res.json({ success: true, message: "Einladung angenommen" });
    } catch (error) {
      console.error("Error accepting clinic invitation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete/cancel clinic invitation
  app.delete("/api/clinic-invitations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const invitation = await storage.getClinicInvitation(id);
      
      if (!invitation) {
        return res.status(404).json({ error: "Einladung nicht gefunden" });
      }
      
      if (!await verifyClinicAccess(req, invitation.clinicId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      await storage.updateClinicInvitationStatus(id, "cancelled");
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting clinic invitation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return httpServer;
}
