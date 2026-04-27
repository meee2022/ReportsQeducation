import { query } from "./_generated/server";
import { v } from "convex/values";

export const overallStats = query({
  args: { schoolId: v.optional(v.string()) },
  handler: async (ctx, { schoolId }) => {
    if (!schoolId) {
      return {
        totalLessons: 0,
        totalAssessments: 0,
        totalStudentsOnLb: 0,
        totalTeachersOnLb: 0,
        totalInteractionTime: 0,
      };
    }

    const lessonsAgg = await ctx.db
      .query("lessonsAgg")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", schoolId))
      .collect();

    const assessmentsAgg = await ctx.db
      .query("assessmentsAgg")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", schoolId))
      .collect();

    const studentLeaderboards = await ctx.db
      .query("studentLeaderboards")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", schoolId))
      .collect();

    const teacherLeaderboards = await ctx.db
      .query("teacherLeaderboards")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", schoolId))
      .collect();

    let totalInteractionTime = 0;
    let isDone = false;
    let cursor: any = undefined;

    while (!isDone) {
      const result: any = await ctx.db
        .query("studentInteractions")
        .withIndex("by_schoolId", (q) => q.eq("schoolId", schoolId))
        .paginate({ numItems: 1000, cursor });

      totalInteractionTime += result.page.reduce(
        (sum: number, interaction: any) => sum + (interaction.totalTime || 0),
        0
      );

      cursor = result.continueCursor;
      isDone = result.isDone;
    }

    return {
      totalLessons: lessonsAgg.length,
      totalAssessments: assessmentsAgg.length,
      totalStudentsOnLb: studentLeaderboards.length,
      totalTeachersOnLb: teacherLeaderboards.length,
      totalInteractionTime,
    };
  },
});
