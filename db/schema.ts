import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
const tenant = () => text("tenant").notNull();
export const packages = sqliteTable(
  "packages",
  {
    tenant: tenant(),
    id: text("id").notNull(),
    name: text("name").notNull(),
    species: text("species").notNull(),
    kind: text("kind").notNull(),
    price: integer("price").notNull(),
    days: integer("days").notNull(),
    description: text("description").notNull(),
    benefits: text("benefits").notNull(),
    active: integer("active").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.tenant, t.id] })],
);
export const assets = sqliteTable(
  "assets",
  {
    tenant: tenant(),
    id: text("id").notNull(),
    name: text("name").notNull(),
    species: text("species").notNull(),
    kind: text("kind").notNull(),
    location: text("location").notNull(),
    status: text("status").notNull(),
    health: text("health").notNull(),
    progress: integer("progress").notNull(),
    weight: text("weight").notNull(),
    started_at: text("started_at").notNull(),
    expected_at: text("expected_at").notNull(),
    customer_id: text("customer_id"),
    package_id: text("package_id"),
  },
  (t) => [
    primaryKey({ columns: [t.tenant, t.id] }),
    index("assets_customer").on(t.tenant, t.customer_id),
  ],
);
export const customers = sqliteTable(
  "customers",
  {
    tenant: tenant(),
    id: text("id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    email_verified: integer("email_verified").notNull(),
    phone_verified: integer("phone_verified").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.tenant, t.id] })],
);
export const orders = sqliteTable(
  "orders",
  {
    tenant: tenant(),
    id: text("id").notNull(),
    asset_id: text("asset_id").notNull(),
    customer_id: text("customer_id").notNull(),
    package_id: text("package_id").notNull(),
    package_name: text("package_name").notNull(),
    price: integer("price").notNull(),
    days: integer("days").notNull(),
    terms: text("terms").notNull(),
    status: text("status").notNull(),
    created_at: text("created_at").notNull(),
    expected_at: text("expected_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tenant, t.id] }),
    uniqueIndex("one_order_per_asset").on(t.tenant, t.asset_id),
    index("orders_customer").on(t.tenant, t.customer_id),
  ],
);
export const logs = sqliteTable(
  "logs",
  {
    tenant: tenant(),
    id: text("id").notNull(),
    asset_id: text("asset_id").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    kind: text("kind").notNull(),
    metric: text("metric").notNull(),
    image_url: text("image_url").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tenant, t.id] }),
    index("logs_asset").on(t.tenant, t.asset_id, t.created_at),
  ],
);
export const requests = sqliteTable(
  "requests",
  {
    tenant: tenant(),
    id: text("id").notNull(),
    asset_id: text("asset_id").notNull(),
    customer_id: text("customer_id").notNull(),
    kind: text("kind").notNull(),
    note: text("note").notNull(),
    status: text("status").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tenant, t.id] }),
    index("requests_customer").on(t.tenant, t.customer_id),
  ],
);
export const demoSessions = sqliteTable("demo_sessions", {
  token_hash: text("token_hash").primaryKey(),
  tenant: tenant(),
  role: text("role").notNull(),
  expires_at: integer("expires_at").notNull(),
});
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expires_at: integer("expires_at").notNull(),
});
