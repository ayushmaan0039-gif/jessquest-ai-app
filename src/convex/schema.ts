import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";
import {
  activeTabValidator,
  chatModeValidator,
  committeeFrameworkValidator,
  interventionStatusValidator,
  interventionTypeValidator,
  poiCategoryValidator,
  resolutionStatusValidator,
  skillLevelValidator,
} from "./shared";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // One workspace row per delegate. This is the persisted global state that
    // the whole dashboard reads: committee framework, skill level, and the
    // active sidebar tab.
    workspaceConfig: defineTable({
      userId: v.id("users"),
      committeeFramework: committeeFrameworkValidator,
      skillLevel: skillLevelValidator,
      activeTab: activeTabValidator,
    }).index("by_userId", ["userId"]),

    // Interventions logged on the floor: speeches, replies, explanations of
    // vote, motions. "live" / "upcoming" / "delivered" mirrors the floor feed.
    interventions: defineTable({
      userId: v.id("users"),
      committeeFramework: committeeFrameworkValidator,
      type: interventionTypeValidator,
      speaker: v.string(),
      delegation: v.string(),
      status: interventionStatusValidator,
      body: v.string(),
      durationSeconds: v.number(),
      bookmarked: v.boolean(),
      createdAt: v.number(),
    }).index("by_userId", ["userId"]),

    // The delegate's personal POI & cross-examination vault.
    pois: defineTable({
      userId: v.id("users"),
      committeeFramework: committeeFrameworkValidator,
      skillLevel: skillLevelValidator,
      category: poiCategoryValidator,
      tone: v.string(),
      question: v.string(),
      response: v.string(),
      tags: v.array(v.string()),
      usageCount: v.number(),
      createdAt: v.number(),
    }).index("by_userId", ["userId"]),

    // Resolution drafts with preambulatory + operative clause banks.
    resolutions: defineTable({
      userId: v.id("users"),
      committeeFramework: committeeFrameworkValidator,
      title: v.string(),
      topic: v.string(),
      sponsors: v.string(),
      preamble: v.array(v.string()),
      operative: v.array(v.string()),
      status: resolutionStatusValidator,
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_userId", ["userId"]),

    // Chat history for the debate assistant (user prompts + AI responses).
    chatMessages: defineTable({
      userId: v.id("users"),
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      mode: chatModeValidator,
      committeeFramework: committeeFrameworkValidator,
      skillLevel: skillLevelValidator,
      createdAt: v.number(),
    }).index("by_userId", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
