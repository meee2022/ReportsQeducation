// convex/studentInteractions.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

// Convex hard limit: 8192 items per array return
const MAX_RETURN = 8000;

export const list = query({
  args: {
    schoolId: v.optional(v.string()),
  },
  handler: async (ctx, { schoolId }) => {
    if (!schoolId) return [];
    return await ctx.db
      .query("studentInteractions")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", schoolId))
      .take(MAX_RETURN);
  },
});
