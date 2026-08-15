import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  committeeFrameworkValidator,
  poiCategoryValidator,
  skillLevelValidator,
} from "./shared";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {
    committeeFramework: v.optional(committeeFrameworkValidator),
    skillLevel: v.optional(skillLevelValidator),
    category: v.optional(poiCategoryValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    let entries = await ctx.db
      .query("pois")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    if (args.committeeFramework !== undefined) {
      entries = entries.filter(
        (entry) => entry.committeeFramework === args.committeeFramework,
      );
    }
    if (args.skillLevel !== undefined) {
      entries = entries.filter((entry) => entry.skillLevel === args.skillLevel);
    }
    if (args.category !== undefined) {
      entries = entries.filter((entry) => entry.category === args.category);
    }

    return entries;
  },
});

export const create = mutation({
  args: {
    committeeFramework: committeeFrameworkValidator,
    skillLevel: skillLevelValidator,
    category: poiCategoryValidator,
    tone: v.string(),
    question: v.string(),
    response: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    return await ctx.db.insert("pois", {
      userId,
      committeeFramework: args.committeeFramework,
      skillLevel: args.skillLevel,
      category: args.category,
      tone: args.tone,
      question: args.question,
      response: args.response,
      tags: args.tags,
      usageCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const incrementUsage = mutation({
  args: { id: v.id("pois") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (existing === null || existing.userId !== userId) {
      throw new Error("Entry not found");
    }

    await ctx.db.patch(args.id, { usageCount: existing.usageCount + 1 });
  },
});

export const remove = mutation({
  args: { id: v.id("pois") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (existing === null || existing.userId !== userId) {
      throw new Error("Entry not found");
    }

    await ctx.db.delete(args.id);
  },
});
