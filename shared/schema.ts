import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

// Suppliers table (companies that sell products)
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  userId: varchar("user_id").notNull(), // Links to auth user who manages this supplier
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

// Clinics table (organizations that order products)
export const clinics = pgTable("clinics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  userId: varchar("user_id").notNull(), // Links to auth user who manages this clinic
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClinicSchema = createInsertSchema(clinics).omit({ id: true, createdAt: true });
export type InsertClinic = z.infer<typeof insertClinicSchema>;
export type Clinic = typeof clinics.$inferSelect;

export const updateClinicSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});
export type UpdateClinic = z.infer<typeof updateClinicSchema>;

// Categories table (product categories per supplier)
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  supplierId: varchar("supplier_id").notNull(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleNumber: text("article_number").notNull(),
  description: text("description").notNull(),
  packQuantity: integer("pack_quantity").notNull(),
  categoryId: varchar("category_id").notNull(),
  supplierId: varchar("supplier_id").notNull(),
  defaultPrice: decimal("default_price", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Quotation requests (clinic requests pricing from supplier)
export const quotationRequests = pgTable("quotation_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clinicId: varchar("clinic_id").notNull(),
  supplierId: varchar("supplier_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, quoted, accepted, rejected
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertQuotationRequestSchema = createInsertSchema(quotationRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuotationRequest = z.infer<typeof insertQuotationRequestSchema>;
export type QuotationRequest = typeof quotationRequests.$inferSelect;

// Quotation items (individual products in a quotation request)
export const quotationItems = pgTable("quotation_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quotationId: varchar("quotation_id").notNull(),
  productId: varchar("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  customPrice: decimal("custom_price", { precision: 10, scale: 2 }), // Price set by supplier
  notes: text("notes"),
});

export const insertQuotationItemSchema = createInsertSchema(quotationItems).omit({ id: true });
export type InsertQuotationItem = z.infer<typeof insertQuotationItemSchema>;
export type QuotationItem = typeof quotationItems.$inferSelect;

// Orders (finalized orders from clinics)
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clinicId: varchar("clinic_id").notNull(),
  supplierId: varchar("supplier_id").notNull(),
  quotationId: varchar("quotation_id"),
  status: text("status").notNull().default("pending"), // pending, confirmed, shipped, delivered, cancelled
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Order items
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  productId: varchar("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// User roles mapping
export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull(), // 'supplier' or 'clinic'
  entityId: varchar("entity_id").notNull(), // supplier_id or clinic_id
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({ id: true });
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRole = typeof userRoles.$inferSelect;

// Supplier invitations (invite coworkers to join supplier workspace)
export const supplierInvitations = pgTable("supplier_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supplierId: varchar("supplier_id").notNull(),
  email: text("email").notNull(),
  token: varchar("token").notNull(),
  invitedBy: varchar("invited_by").notNull(), // user ID of inviter
  status: text("status").notNull().default("pending"), // pending, accepted, expired
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertSupplierInvitationSchema = createInsertSchema(supplierInvitations).omit({ id: true, createdAt: true });
export type InsertSupplierInvitation = z.infer<typeof insertSupplierInvitationSchema>;
export type SupplierInvitation = typeof supplierInvitations.$inferSelect;

// Clinic invitations (invite coworkers to join clinic workspace)
export const clinicInvitations = pgTable("clinic_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clinicId: varchar("clinic_id").notNull(),
  email: text("email").notNull(),
  token: varchar("token").notNull(),
  invitedBy: varchar("invited_by").notNull(), // user ID of inviter
  status: text("status").notNull().default("pending"), // pending, accepted, expired
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertClinicInvitationSchema = createInsertSchema(clinicInvitations).omit({ id: true, createdAt: true });
export type InsertClinicInvitation = z.infer<typeof insertClinicInvitationSchema>;
export type ClinicInvitation = typeof clinicInvitations.$inferSelect;
