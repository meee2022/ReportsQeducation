// convex/terms.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getActive = query({
  args: { schoolId: v.optional(v.string()) },
  handler: async (ctx, { schoolId }) => {
    if (!schoolId) return null;
    return await ctx.db
      .query("terms")
      .filter((qq) => qq.and(
        qq.eq(qq.field("active"), true),
        qq.eq(qq.field("schoolId"), schoolId)
      ))
      .first();
  },
});

export const list = query({
  args: { schoolId: v.optional(v.string()) },
  handler: async (ctx, { schoolId }) => {
    if (!schoolId) return [];
    return await ctx.db
      .query("terms")
      .filter((qq) => qq.eq(qq.field("schoolId"), schoolId))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("terms")),
    schoolId: v.optional(v.string()),
    name: v.string(),
    code: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    active: v.boolean(),
    schoolName: v.optional(v.string()),
    principalName: v.optional(v.string()),
    viceNames: v.optional(v.string()),
    coordinatorName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const data = {
      schoolId: args.schoolId ?? undefined,
      name: args.name,
      code: args.code,
      startDate: args.startDate,
      endDate: args.endDate,
      active: args.active,
      schoolName: args.schoolName ?? "",
      principalName: args.principalName ?? "",
      viceNames: args.viceNames ?? "",
      coordinatorName: args.coordinatorName ?? "",
    };
    if (args.id) {
      await ctx.db.patch(args.id, data);
      return args.id;
    } else {
      return await ctx.db.insert("terms", data);
    }
  },
});
