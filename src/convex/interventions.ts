import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { committeeFrameworkValidator, interventionStatusValidator, interventionTypeValidator } from "./shared";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    return await ctx.db
      .query("interventions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    type: interventionTypeValidator,
    speaker: v.string(),
    delegation: v.string(),
    status: interventionStatusValidator,
    body: v.string(),
    durationSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    // Default the committee framework from the workspace config so the feed
    // stays consistent with the header dropdown.
    const config = await ctx.db
      .query("workspaceConfig")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    return await ctx.db.insert("interventions", {
      userId,
      committeeFramework: config?.committeeFramework ?? "un",
      type: args.type,
      speaker: args.speaker,
      delegation: args.delegation,
      status: args.status,
      body: args.body,
      durationSeconds: args.durationSeconds,
      bookmarked: false,
      createdAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("interventions"),
    status: interventionStatusValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (existing === null || existing.userId !== userId) {
      throw new Error("Intervention not found");
    }

    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const toggleBookmark = mutation({
  args: { id: v.id("interventions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (existing === null || existing.userId !== userId) {
      throw new Error("Intervention not found");
    }

    await ctx.db.patch(args.id, { bookmarked: !existing.bookmarked });
  },
});

export const remove = mutation({
  args: { id: v.id("interventions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (existing === null || existing.userId !== userId) {
      throw new Error("Intervention not found");
    }

    await ctx.db.delete(args.id);
  },
});
