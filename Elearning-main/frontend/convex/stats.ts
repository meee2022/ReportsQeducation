import { query } from "./_generated/server";

// Query to get overall statistics
export const overallStats = query({
  args: {},
  handler: async (ctx) => {
    const lessonsAgg = await ctx.db.query("lessonsAgg").collect();
    const assessmentsAgg = await ctx.db.query("assessmentsAgg").collect();
    const studentLeaderboards = await ctx.db.query("studentLeaderboards").collect();
    const teacherLeaderboards = await ctx.db.query("teacherLeaderboards").collect();
    const studentInteractions = await ctx.db.query("studentInteractions").collect();

    const totalInteractionTime = studentInteractions.reduce(
      (sum, interaction) => sum + (interaction.totalTime || 0),
      0
    );

    return {
      totalLessons: lessonsAgg.length,
      totalAssessments: assessmentsAgg.length,
      totalStudentsOnLb: studentLeaderboards.length,
      totalTeachersOnLb: teacherLeaderboards.length,
      totalInteractionTime,
    };
  },
});
