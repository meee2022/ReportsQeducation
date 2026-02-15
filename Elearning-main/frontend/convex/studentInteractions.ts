import { query } from "./_generated/server";

// Query to list all student interactions
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("studentInteractions").collect();
  },
});
