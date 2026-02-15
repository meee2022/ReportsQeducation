import { query } from "./_generated/server";

// Query to list all user activity entries
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("userActivity").collect();
  },
});
