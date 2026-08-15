import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  activeTabValidator,
  committeeFrameworkValidator,
  skillLevelValidator,
} from "./shared";
import { mutation, query } from "./_generated/server";

/**
 * Global workspace configuration: which committee framework is on the floor,
 * which skill level the delegate is training at, and which sidebar tab is
 * active. Persisted per user so the dashboard state survives reloads.
 */
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const existing = await ctx.db
      .query("workspaceConfig")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing !== null) {
      return existing;
    }

    return {
      committeeFramework: "un" as const,
      skillLevel: "beginner" as const,
      activeTab: "interventions" as const,
    };
  },
});

export const setConfig = mutation({
  args: {
    committeeFramework: v.optional(committeeFrameworkValidator),
    skillLevel: v.optional(skillLevelValidator),
    activeTab: v.optional(activeTabValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("workspaceConfig")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        ...(args.committeeFramework !== undefined && {
          committeeFramework: args.committeeFramework,
        }),
        ...(args.skillLevel !== undefined && {
          skillLevel: args.skillLevel,
        }),
        ...(args.activeTab !== undefined && { activeTab: args.activeTab }),
      });
      return existing._id;
    }

    return await ctx.db.insert("workspaceConfig", {
      userId,
      committeeFramework: args.committeeFramework ?? "un",
      skillLevel: args.skillLevel ?? "beginner",
      activeTab: args.activeTab ?? "interventions",
    });
  },
});
