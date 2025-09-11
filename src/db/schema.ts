import { relations } from "drizzle-orm";
import {
  uuid,
  varchar,
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  userId: uuid().defaultRandom().primaryKey(),
  image: varchar(),
  fullName: varchar({ length: 225 }).notNull(),
  age: integer().notNull(),
  exam: varchar({ length: 225 }).notNull(),
  phoneNumber: text("phone_number").unique().notNull(),
  phoneNumberVerified: boolean("phone_number_verified"),
  email: text().unique().notNull(),
  emailVerified: boolean("email_verified"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const plans = pgTable("plans", {
  planId: uuid().defaultRandom().primaryKey(),
  planName: varchar().notNull(),
  planPrice: integer().notNull(),
  userId: uuid()
    .notNull()
    .references(() => users.userId),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const plansRelations = relations(plans, ({ one }) => ({
  user: one(users, {
    fields: [plans.userId],
    references: [users.userId],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  plans: many(plans),
}));

export const session = pgTable("session", {
  id: uuid("id").primaryKey().defaultRandom(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.userId, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.userId, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
});

// export const schema = { users, verification, session, plans, account };
