import { query } from "./_generated/server";

// Query to list all assessments aggregation data
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("assessmentsAgg").collect();
  },
});
