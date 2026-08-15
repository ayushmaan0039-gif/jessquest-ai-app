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

/**
 * Stream a partial assistant response into an existing message. Called by
 * `api.debate.generateStrategicContent` once per token chunk; each call is a
 * committed DB update, so the reactive `list` query re-renders the feed live.
 */
export const patchContent = mutation({
  args: {
    id: v.id("chatMessages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.id);
    if (!message || message.userId !== userId) {
      throw new Error("Message not found");
    }

    await ctx.db.patch(args.id, { content: args.content });
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
