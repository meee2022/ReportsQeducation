// convex/lessonsAgg.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("lessonsAgg").collect();
  },
});

export const list = query({
  args: {
    schoolId: v.optional(v.string()),
  },
  handler: async (ctx, { schoolId }) => {
    if (!schoolId) return [];
    return await ctx.db
      .query("lessonsAgg")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", schoolId))
      .collect();
  },
});
