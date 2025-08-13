import { pgTable, varchar, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Email tracking table for analytics and user management
export const emailTracking = pgTable("email_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: text("verification_token"),
  verificationRequestedAt: timestamp("verification_requested_at"),
  verifiedAt: timestamp("verified_at"),
  
  // Email engagement tracking
  lastEmailSent: timestamp("last_email_sent"),
  totalEmailsSent: integer("total_emails_sent").notNull().default(0),
  lastEmailOpened: timestamp("last_email_opened"),
  totalEmailsOpened: integer("total_emails_opened").notNull().default(0),
  
  // User engagement metrics
  signupSource: text("signup_source"), // e.g., "direct", "referral", "campaign"
  signupCampaign: text("signup_campaign"), // Campaign identifier if applicable
  firstLoginAt: timestamp("first_login_at"),
  lastActiveAt: timestamp("last_active_at"),
  totalSessionTime: integer("total_session_time").notNull().default(0), // in seconds
  
  // Preferences
  emailPreferences: jsonb("email_preferences").$type<{
    marketing: boolean;
    weeklyProgress: boolean;
    achievements: boolean;
    friendChallenges: boolean;
  }>().default({
    marketing: true,
    weeklyProgress: true,
    achievements: true,
    friendChallenges: true
  }),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// User table reference
import { users } from "./schema";
import { integer } from "drizzle-orm/pg-core";

// Export insert schema
export const insertEmailTrackingSchema = createInsertSchema(emailTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmailTracking = z.infer<typeof insertEmailTrackingSchema>;
export type EmailTracking = typeof emailTracking.$inferSelect;