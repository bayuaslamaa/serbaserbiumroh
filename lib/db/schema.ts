import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
  unique,
  uniqueIndex,
  index,
  bigint,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"

// --- Enums ---
export const cityEnum = pgEnum("city", ["MAKKAH", "MADINAH"])
export const hotelTierEnum = pgEnum("hotel_tier", [
  "ECONOMY",
  "STANDARD",
  "PELATARAN",
  "PREMIUM",
])
export const airlineTierEnum = pgEnum("airline_tier", [
  "BUDGET",
  "STANDARD",
  "GARUDA",
  "BUSINESS",
])
export const serviceKeyEnum = pgEnum("service_key", [
  "VISA",
  "SISKOPATUH",
  "TASREH",
  "TRANSPORT",
  "TOUR_MAKKAH",
  "TOUR_MADINAH",
])
export const roleEnum = pgEnum("role", ["USER", "ADMIN"])
export const communityJoinRequestStatusEnum = pgEnum("community_join_request_status", [
  "NEW",
  "MATCHED",
  "REJECTED",
])

// --- Exchange Rates ---
export const exchangeRates = pgTable("exchange_rates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  currency: text("currency").notNull(), // "SAR" | "USD"
  rateToIdr: integer("rate_to_idr").notNull(), // e.g. SAR=4700, USD=17300
  updatedBy: text("updated_by").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// --- Hotel Prices (per room/night, SAR, fullboard included) ---
export const hotelPrices = pgTable("hotel_prices", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  city: cityEnum("city").notNull(),
  tier: hotelTierEnum("tier").notNull(),
  importKey: text("import_key").notNull().unique(),
  sarPerNight: integer("sar_per_night").notNull(),
  label: text("label").notNull(), // e.g. "Safwa Tower 3"
  sublabel: text("sublabel").notNull(), // e.g. "3★, dekat Haram"
  distance: text("distance"), // e.g. "250m", "ring 1", "jalan kaki"
  agodaUrl: text("agoda_url"),
  bookingcomUrl: text("bookingcom_url"),
  tripcomUrl: text("tripcom_url"),
  bookingUrl: text("booking_url"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// --- Airline Prices (IDR, per person round-trip) ---
export const airlinePrices = pgTable(
  "airline_prices",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    tier: airlineTierEnum("tier").notNull(),
    importKey: text("import_key").notNull().unique(),
    idr: integer("idr").notNull(),
    label: text("label").notNull(), // e.g. "Lion Air, AirAsia"
    sublabel: text("sublabel").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("airline_prices_default_tier_unique")
      .on(t.tier)
      .where(sql`${t.isDefault} = true`),
  ]
)

// --- Service Fees ---
export const serviceFees = pgTable("service_fees", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  key: serviceKeyEnum("key").notNull().unique(),
  currency: text("currency").notNull(), // "SAR" | "IDR" | "USD"
  amount: integer("amount").notNull(),
  label: text("label").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  divideByPax: boolean("divide_by_pax").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// --- Hotel Monthly Prices (per hotel entry, month 1-12) ---
export const hotelMonthlyPrices = pgTable(
  "hotel_monthly_prices",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    hotelPriceId: text("hotel_price_id")
      .notNull()
      .references(() => hotelPrices.id, { onDelete: "cascade" }),
    month: integer("month").notNull(), // 1-12
    sarPerNight: integer("sar_per_night").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.hotelPriceId, t.month)]
)

// --- Airline Monthly Prices (per airline option, month 1-12, IDR round-trip per person) ---
export const airlineMonthlyPrices = pgTable(
  "airline_monthly_prices",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    airlinePriceId: text("airline_price_id")
      .notNull()
      .references(() => airlinePrices.id, { onDelete: "cascade" }),
    month: integer("month").notNull(), // 1-12
    idr: integer("idr").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.airlinePriceId, t.month)]
)

// --- Room Multipliers (seeded, not admin-editable in v1) ---
export const roomMultipliers = pgTable("room_multipliers", {
  type: text("type").primaryKey(), // "QUAD" | "TRIPLE" | "DOUBLE" | "SINGLE"
  paxPerRoom: integer("pax_per_room").notNull(), // 4 | 3 | 2 | 1
  multiplier: text("multiplier").notNull(), // stored as string to avoid float precision issues
  label: text("label").notNull(),
  sublabel: text("sublabel").notNull(),
})

// --- Users ---
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  password: text("password"), // hashed, null for OAuth users
  role: roleEnum("role").notNull().default("USER"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Auth.js required tables for DrizzleAdapter
export const accounts = pgTable("accounts", {
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
})

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

// --- Estimates ---
export const estimates = pgTable("estimates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  rawInput: text("raw_input").notNull(),
  aiNotes: text("ai_notes"),
  params: jsonb("params").notNull(), // EstimateParams snapshot
  totalIdrPax: integer("total_idr_pax").notNull(),
  totalIdrGrp: integer("total_idr_grp").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// --- Activity Logs ---
export const activityLogs = pgTable("activity_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  flow: text("flow").notNull(), // e.g. "estimate"
  event: text("event").notNull(), // e.g. "ai_parse", "estimate_save"
  status: text("status").notNull(), // "SUCCESS" | "ERROR" | future statuses
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  input: jsonb("input"),
  output: jsonb("output"),
  error: text("error"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// --- Community Join Requests ---
export const communityJoinRequests = pgTable(
  "community_join_requests",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    normalizedPhone: text("normalized_phone").notNull(),
    socialUsername: text("social_username"),
    normalizedSocialUsername: text("normalized_social_username"),
    intent: text("intent"),
    status: communityJoinRequestStatusEnum("status").notNull().default("NEW"),
    adminNote: text("admin_note").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("community_join_requests_normalized_phone_idx").on(t.normalizedPhone),
    index("community_join_requests_normalized_social_idx").on(t.normalizedSocialUsername),
    index("community_join_requests_status_created_at_idx").on(t.status, t.createdAt),
  ]
)

// --- Pilgrim Stories ---
export const pilgrimStories = pgTable("pilgrim_stories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  slug: text("slug").unique().notNull(),
  authorName: text("author_name").notNull(),
  departureCity: text("departure_city").notNull(),
  travelMonth: integer("travel_month"),
  travelYear: integer("travel_year"),
  pax: integer("pax").notNull(),
  hotelTier: hotelTierEnum("hotel_tier").notNull(),
  airlineTier: airlineTierEnum("airline_tier"),
  makkahNights: integer("makkah_nights").notNull(),
  madinahNights: integer("madinah_nights").notNull(),
  totalBudgetIdr: bigint("total_budget_idr", { mode: "number" }).notNull(),
  narrative: text("narrative").notNull().default(""),
  isPublished: boolean("is_published").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// --- Story Itinerary Days ---
export const storyItineraryDays = pgTable("story_itinerary_days", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  storyId: text("story_id")
    .notNull()
    .references(() => pilgrimStories.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  label: text("label").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// --- Story Packing Items ---
export const storyPackingItems = pgTable("story_packing_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  storyId: text("story_id")
    .notNull()
    .references(() => pilgrimStories.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  itemName: text("item_name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// --- Hotel Listings ---
export const hotelListings = pgTable("hotel_listings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  city: cityEnum("city").notNull(),
  tier: hotelTierEnum("tier").notNull(),
  distanceMeters: integer("distance_meters"),
  facilities: text("facilities").notNull().default(""),
  pilgrimNotes: text("pilgrim_notes").notNull().default(""),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// --- FAQ Groups ---
export const faqGroups = pgTable("faq_groups", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// --- FAQ Items ---
export const faqItems = pgTable("faq_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  groupId: text("group_id")
    .notNull()
    .references(() => faqGroups.id),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// --- Visitor Logs ---
export const visitorLogs = pgTable(
  "visitor_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    ipHash: text("ip_hash").notNull(),
    userAgent: text("user_agent"),
    path: text("path").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("visitor_logs_ip_hash_idx").on(t.ipHash),
    index("visitor_logs_created_at_idx").on(t.createdAt),
    index("visitor_logs_path_idx").on(t.path),
  ]
)

// --- Inferred types ---
export type ExchangeRate = typeof exchangeRates.$inferSelect
export type HotelPrice = typeof hotelPrices.$inferSelect
export type HotelMonthlyPrice = typeof hotelMonthlyPrices.$inferSelect
export type AirlinePrice = typeof airlinePrices.$inferSelect
export type AirlineMonthlyPrice = typeof airlineMonthlyPrices.$inferSelect
export type ServiceFee = typeof serviceFees.$inferSelect
export type RoomMultiplier = typeof roomMultipliers.$inferSelect
export type User = typeof users.$inferSelect
export type Estimate = typeof estimates.$inferSelect
export type NewEstimate = typeof estimates.$inferInsert
export type ActivityLog = typeof activityLogs.$inferSelect
export type NewActivityLog = typeof activityLogs.$inferInsert
export type CommunityJoinRequest = typeof communityJoinRequests.$inferSelect
export type NewCommunityJoinRequest = typeof communityJoinRequests.$inferInsert
export type PilgrimStory = typeof pilgrimStories.$inferSelect
export type NewPilgrimStory = typeof pilgrimStories.$inferInsert
export type StoryItineraryDay = typeof storyItineraryDays.$inferSelect
export type NewStoryItineraryDay = typeof storyItineraryDays.$inferInsert
export type StoryPackingItem = typeof storyPackingItems.$inferSelect
export type NewStoryPackingItem = typeof storyPackingItems.$inferInsert
export type HotelListing = typeof hotelListings.$inferSelect
export type NewHotelListing = typeof hotelListings.$inferInsert
export type FaqGroup = typeof faqGroups.$inferSelect
export type NewFaqGroup = typeof faqGroups.$inferInsert
export type FaqItem = typeof faqItems.$inferSelect
export type NewFaqItem = typeof faqItems.$inferInsert
export type VisitorLog = typeof visitorLogs.$inferSelect
export type NewVisitorLog = typeof visitorLogs.$inferInsert
