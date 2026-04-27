import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { schoolId: v.optional(v.string()) },
  handler: async (ctx, { schoolId }) => {
    if (!schoolId) return [];
    return await ctx.db
      .query("userActivity")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", schoolId))
      .collect();
  },
});
