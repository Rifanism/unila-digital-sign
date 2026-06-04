import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const digitalIdRequestsTable = pgTable("digital_id_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  name: text("name").notNull(),
  role: text("role", { enum: ["dosen", "mahasiswa"] }).notNull(),
  email: text("email").notNull(),
  passphrase: text("passphrase").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected", "revoked"] }).notNull().default("pending"),
  isApproved: boolean("is_approved").notNull().default(false),
  isReady: boolean("is_ready").notNull().default(false),
  isSent: boolean("is_sent").notNull().default(false),
  rejectionReason: text("rejection_reason"),
  // NIM (mahasiswa) or NIP (dosen)
  nimNip: text("nim_nip"),
  // Simulated p12 file data (base64)
  p12Data: text("p12_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDigitalIdRequestSchema = createInsertSchema(digitalIdRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDigitalIdRequest = z.infer<typeof insertDigitalIdRequestSchema>;
export type DigitalIdRequest = typeof digitalIdRequestsTable.$inferSelect;
