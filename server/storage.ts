import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  suppliers,
  clinics,
  categories,
  products,
  quotationRequests,
  quotationItems,
  orders,
  orderItems,
  userRoles,
  type Supplier,
  type InsertSupplier,
  type Clinic,
  type InsertClinic,
  type Category,
  type InsertCategory,
  type Product,
  type InsertProduct,
  type QuotationRequest,
  type InsertQuotationRequest,
  type QuotationItem,
  type InsertQuotationItem,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type UserRole,
  type InsertUserRole,
} from "@shared/schema";

export interface IStorage {
  // Suppliers
  getSupplier(id: string): Promise<Supplier | undefined>;
  getSupplierByUserId(userId: string): Promise<Supplier | undefined>;
  getAllSuppliers(): Promise<Supplier[]>;
  createSupplier(data: InsertSupplier): Promise<Supplier>;

  // Clinics
  getClinic(id: string): Promise<Clinic | undefined>;
  getClinicByUserId(userId: string): Promise<Clinic | undefined>;
  createClinic(data: InsertClinic): Promise<Clinic>;

  // Categories
  getCategory(id: string): Promise<Category | undefined>;
  getCategoriesBySupplierId(supplierId: string): Promise<Category[]>;
  getAllCategories(): Promise<Category[]>;
  createCategory(data: InsertCategory): Promise<Category>;
  updateCategory(id: string, name: string): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<void>;

  // Products
  getProduct(id: string): Promise<Product | undefined>;
  getProductsBySupplierId(supplierId: string): Promise<Product[]>;
  getAllProducts(): Promise<Product[]>;
  createProduct(data: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;

  // Quotations
  getQuotationRequest(id: string): Promise<QuotationRequest | undefined>;
  getQuotationsBySupplierId(supplierId: string): Promise<QuotationRequest[]>;
  getQuotationsByClinicId(clinicId: string): Promise<QuotationRequest[]>;
  createQuotationRequest(data: InsertQuotationRequest): Promise<QuotationRequest>;
  updateQuotationStatus(id: string, status: string): Promise<QuotationRequest | undefined>;

  // Quotation Items
  getQuotationItems(quotationId: string): Promise<QuotationItem[]>;
  createQuotationItem(data: InsertQuotationItem): Promise<QuotationItem>;
  updateQuotationItemPrice(id: string, customPrice: string): Promise<QuotationItem | undefined>;

  // Orders
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersBySupplierId(supplierId: string): Promise<Order[]>;
  getOrdersByClinicId(clinicId: string): Promise<Order[]>;
  createOrder(data: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;

  // Order Items
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(data: InsertOrderItem): Promise<OrderItem>;

  // User Roles
  getUserRole(userId: string): Promise<UserRole | undefined>;
  createUserRole(data: InsertUserRole): Promise<UserRole>;
}

export class DatabaseStorage implements IStorage {
  // Suppliers
  async getSupplier(id: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier;
  }

  async getSupplierByUserId(userId: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.userId, userId));
    return supplier;
  }

  async getAllSuppliers(): Promise<Supplier[]> {
    return db.select().from(suppliers);
  }

  async createSupplier(data: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db.insert(suppliers).values(data).returning();
    return supplier;
  }

  // Clinics
  async getClinic(id: string): Promise<Clinic | undefined> {
    const [clinic] = await db.select().from(clinics).where(eq(clinics.id, id));
    return clinic;
  }

  async getClinicByUserId(userId: string): Promise<Clinic | undefined> {
    const [clinic] = await db.select().from(clinics).where(eq(clinics.userId, userId));
    return clinic;
  }

  async createClinic(data: InsertClinic): Promise<Clinic> {
    const [clinic] = await db.insert(clinics).values(data).returning();
    return clinic;
  }

  // Categories
  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async getCategoriesBySupplierId(supplierId: string): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.supplierId, supplierId));
  }

  async getAllCategories(): Promise<Category[]> {
    return db.select().from(categories);
  }

  async createCategory(data: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(data).returning();
    return category;
  }

  async updateCategory(id: string, name: string): Promise<Category | undefined> {
    const [category] = await db.update(categories).set({ name }).where(eq(categories.id, id)).returning();
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Products
  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductsBySupplierId(supplierId: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.supplierId, supplierId));
  }

  async getAllProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.isActive, true));
  }

  async createProduct(data: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(data).returning();
    return product;
  }

  async updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.update(products).set({ isActive: false }).where(eq(products.id, id));
  }

  // Quotations
  async getQuotationRequest(id: string): Promise<QuotationRequest | undefined> {
    const [quotation] = await db.select().from(quotationRequests).where(eq(quotationRequests.id, id));
    return quotation;
  }

  async getQuotationsBySupplierId(supplierId: string): Promise<QuotationRequest[]> {
    return db.select().from(quotationRequests)
      .where(eq(quotationRequests.supplierId, supplierId))
      .orderBy(desc(quotationRequests.createdAt));
  }

  async getQuotationsByClinicId(clinicId: string): Promise<QuotationRequest[]> {
    return db.select().from(quotationRequests)
      .where(eq(quotationRequests.clinicId, clinicId))
      .orderBy(desc(quotationRequests.createdAt));
  }

  async createQuotationRequest(data: InsertQuotationRequest): Promise<QuotationRequest> {
    const [quotation] = await db.insert(quotationRequests).values(data).returning();
    return quotation;
  }

  async updateQuotationStatus(id: string, status: string): Promise<QuotationRequest | undefined> {
    const [quotation] = await db.update(quotationRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(quotationRequests.id, id))
      .returning();
    return quotation;
  }

  // Quotation Items
  async getQuotationItems(quotationId: string): Promise<QuotationItem[]> {
    return db.select().from(quotationItems).where(eq(quotationItems.quotationId, quotationId));
  }

  async createQuotationItem(data: InsertQuotationItem): Promise<QuotationItem> {
    const [item] = await db.insert(quotationItems).values(data).returning();
    return item;
  }

  async updateQuotationItemPrice(id: string, customPrice: string): Promise<QuotationItem | undefined> {
    const [item] = await db.update(quotationItems)
      .set({ customPrice })
      .where(eq(quotationItems.id, id))
      .returning();
    return item;
  }

  // Orders
  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersBySupplierId(supplierId: string): Promise<Order[]> {
    return db.select().from(orders)
      .where(eq(orders.supplierId, supplierId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrdersByClinicId(clinicId: string): Promise<Order[]> {
    return db.select().from(orders)
      .where(eq(orders.clinicId, clinicId))
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(data: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(data).returning();
    return order;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [order] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return order;
  }

  // Order Items
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(data: InsertOrderItem): Promise<OrderItem> {
    const [item] = await db.insert(orderItems).values(data).returning();
    return item;
  }

  // User Roles
  async getUserRole(userId: string): Promise<UserRole | undefined> {
    const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, userId));
    return role;
  }

  async createUserRole(data: InsertUserRole): Promise<UserRole> {
    const [role] = await db.insert(userRoles).values(data).returning();
    return role;
  }
}

export const storage = new DatabaseStorage();
