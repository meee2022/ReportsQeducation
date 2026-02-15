import { query } from "./_generated/server";

// Query to list all lessons aggregation data
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("lessonsAgg").collect();
  },
});
