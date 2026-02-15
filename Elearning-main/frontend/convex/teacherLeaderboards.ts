import { query } from "./_generated/server";

// Query to list all teacher leaderboard entries
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("teacherLeaderboards").collect();
  },
});
