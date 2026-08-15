import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  chatModeValidator,
  committeeFrameworkValidator,
  skillLevelValidator,
} from "./shared";
import { mutation, query } from "./_generated/server";

/** All chat messages for the signed-in delegate, oldest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    return await ctx.db
      .query("chatMessages")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();
  },
});

/** Persist one chat message (user prompt or completed AI response). */
export const insert = mutation({
  args: {
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    mode: chatModeValidator,
    committeeFramework: committeeFrameworkValidator,
    skillLevel: skillLevelValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    return await ctx.db.insert("chatMessages", {
      userId,
      role: args.role,
      content: args.content,
      mode: args.mode,
      committeeFramework: args.committeeFramework,
      skillLevel: args.skillLevel,
      createdAt: Date.now(),
    });
  },
});
