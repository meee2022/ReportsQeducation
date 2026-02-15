import { query } from "./_generated/server";

// Query to list all student leaderboard entries
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("studentLeaderboards").collect();
  },
});
