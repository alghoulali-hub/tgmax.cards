import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("cms_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role", { enum: ["owner", "admin", "editor"] }).notNull().default("editor"),
  status: text("status", { enum: ["active", "invited", "disabled"] }).notNull().default("active"),
  createdAt: text("created_at").notNull(),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  accent: text("accent").notNull().default("#d8ff3e"),
  createdAt: text("created_at").notNull(),
});

export const cards = sqliteTable("cards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
  cardCode: text("card_code").notNull().default(""),
  imageKey: text("image_key"),
  priceCents: integer("price_cents").notNull().default(0),
  stock: integer("stock").notNull().default(0),
  condition: text("condition").notNull().default("Near mint"),
  status: text("status", { enum: ["active", "draft", "sold"] }).notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("cards_category_idx").on(table.categoryId)]);
