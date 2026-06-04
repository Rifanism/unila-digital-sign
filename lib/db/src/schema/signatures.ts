import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const signatureImagesTable = pgTable("signature_images", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  imageData: text("image_data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSignatureImageSchema = createInsertSchema(signatureImagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSignatureImage = z.infer<typeof insertSignatureImageSchema>;
export type SignatureImage = typeof signatureImagesTable.$inferSelect;
