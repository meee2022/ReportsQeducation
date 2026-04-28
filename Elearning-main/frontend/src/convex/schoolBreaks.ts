// convex/schoolBreaks.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// إضافة إجازة/توقف جديد
export const add = mutation({
  args: {
    schoolId: v.optional(v.string()),
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    type: v.union(v.literal("holiday"), v.literal("emergency")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("schoolBreaks", {
      schoolId: args.schoolId ?? undefined,
      name: args.name,
      startDate: args.startDate,
      endDate: args.endDate,
      type: args.type,
      notes: args.notes,
    });
  },
});

// قائمة الإجازات
export const list = query({
  args: {
    schoolId: v.optional(v.string()),
  },
  handler: async (ctx, { schoolId }) => {
    if (!schoolId) return [];
    return await ctx.db
      .query("schoolBreaks")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", schoolId))
      .collect();
  },
});

// حذف إجازة
export const remove = mutation({
  args: {
    id: v.id("schoolBreaks"),
  },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// حساب إجمالي أيام التوقف بين تاريخين
export const getTotalBreakDays = query({
  args: {
    schoolId: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { schoolId, startDate, endDate }) => {
    if (!schoolId) return 0;
    
    const breaks = await ctx.db
      .query("schoolBreaks")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", schoolId))
      .collect();
    
    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);
    
    let totalDays = 0;
    
    for (const b of breaks) {
      const breakStart = new Date(b.startDate);
      const breakEnd = new Date(b.endDate);
      
      // التحقق من وجود تداخل بين الفترتين
      if (breakEnd >= rangeStart && breakStart <= rangeEnd) {
        // حساب التداخل
        const overlapStart = breakStart > rangeStart ? breakStart : rangeStart;
        const overlapEnd = breakEnd < rangeEnd ? breakEnd : rangeEnd;
        const days = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        totalDays += Math.max(0, days);
      }
    }
    
    return totalDays;
  },
});
