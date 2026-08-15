import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  committeeFrameworkValidator,
  resolutionStatusValidator,
} from "./shared";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    return await ctx.db
      .query("resolutions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    committeeFramework: committeeFrameworkValidator,
    title: v.string(),
    topic: v.string(),
    sponsors: v.string(),
    preamble: v.array(v.string()),
    operative: v.array(v.string()),
    status: resolutionStatusValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const now = Date.now();
    return await ctx.db.insert("resolutions", {
      userId,
      committeeFramework: args.committeeFramework,
      title: args.title,
      topic: args.topic,
      sponsors: args.sponsors,
      preamble: args.preamble,
      operative: args.operative,
      status: args.status,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("resolutions"),
    title: v.optional(v.string()),
    topic: v.optional(v.string()),
    sponsors: v.optional(v.string()),
    preamble: v.optional(v.array(v.string())),
    operative: v.optional(v.array(v.string())),
    status: v.optional(resolutionStatusValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (existing === null || existing.userId !== userId) {
      throw new Error("Resolution not found");
    }

    await ctx.db.patch(args.id, {
      ...(args.title !== undefined && { title: args.title }),
      ...(args.topic !== undefined && { topic: args.topic }),
      ...(args.sponsors !== undefined && { sponsors: args.sponsors }),
      ...(args.preamble !== undefined && { preamble: args.preamble }),
      ...(args.operative !== undefined && { operative: args.operative }),
      ...(args.status !== undefined && { status: args.status }),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("resolutions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (existing === null || existing.userId !== userId) {
      throw new Error("Resolution not found");
    }

    await ctx.db.delete(args.id);
  },
});
