import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  name: text("name").notNull(),
  fileData: text("file_data").notNull(),
  fileType: text("file_type").notNull().default("application/pdf"),
  status: text("status", { enum: ["uploaded", "pending_sign", "signed", "rejected"] }).notNull().default("uploaded"),
  pageCount: integer("page_count").default(1),
  signedFileData: text("signed_file_data"),
  verificationToken: text("verification_token").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const signRequestsTable = pgTable("sign_requests", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documentsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  signaturePage: integer("signature_page").notNull().default(1),
  signatureX: text("signature_x").notNull().default("10"),
  signatureY: text("signature_y").notNull().default("10"),
  signatureWidth: text("signature_width").notNull().default("20"),
  signatureHeight: text("signature_height").notNull().default("10"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const activityLogTable = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  userId: integer("user_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;

export const insertSignRequestSchema = createInsertSchema(signRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSignRequest = z.infer<typeof insertSignRequestSchema>;
export type SignRequest = typeof signRequestsTable.$inferSelect;
