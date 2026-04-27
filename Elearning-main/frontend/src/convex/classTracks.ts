// convex/classTracks.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const TEMPLATE_ID = "__template_secondary__";

export const upload = mutation({
  args: { content: v.string(), schoolId: v.optional(v.string()) },
  handler: async (ctx, { content, schoolId }) => {
    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("grade"));

    // احذف البيانات القديمة لهذه المدرسة فقط
    let existingQuery = ctx.db.query("classTracks");
    if (schoolId) {
      const existing = await existingQuery
        .withIndex("by_schoolId", (q) => q.eq("schoolId", schoolId))
        .collect();
      for (const row of existing) await ctx.db.delete(row._id);
    } else {
      const existing = await existingQuery.collect();
      for (const row of existing) await ctx.db.delete(row._id);
    }

    for (const line of lines) {
      const [grade, className, track] = line.split(",");
      if (!grade || !className || !track) continue;

      await ctx.db.insert("classTracks", {
        schoolId: schoolId ?? undefined,
        grade,
        className,
        track,
      });
    }

    return { imported: lines.length };
  },
});

export const list = query({
  args: { schoolId: v.optional(v.string()) },
  handler: async (ctx, { schoolId }) => {
    if (!schoolId) return [];
    return await ctx.db
      .query("classTracks")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", schoolId))
      .collect();
  },
});

export const addTrack = mutation({
  args: { schoolId: v.optional(v.string()), grade: v.string(), className: v.string(), track: v.string() },
  handler: async (ctx, { schoolId, grade, className, track }) => {
    let existingQuery = ctx.db.query("classTracks");
    if (schoolId) {
      existingQuery = existingQuery.withIndex("by_schoolId", (q) => q.eq("schoolId", schoolId)) as any;
    }
    const existing = await (existingQuery as any)
      .filter((q: any) =>
        q.and(
          q.eq(q.field("grade"), grade),
          q.eq(q.field("className"), className)
        )
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { track });
      return existing._id;
    }
    return await ctx.db.insert("classTracks", {
      schoolId: schoolId ?? undefined,
      grade,
      className,
      track,
    });
  },
});

export const updateTrack = mutation({
  args: { id: v.id("classTracks"), track: v.string() },
  handler: async (ctx, { id, track }) => {
    await ctx.db.patch(id, { track });
  },
});

export const removeTrack = mutation({
  args: { id: v.id("classTracks") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

/** حفظ مسارات الشعب الحالية كقالب مشترك */
export const saveAsTemplate = mutation({
  args: { sourceSchoolId: v.string() },
  handler: async (ctx, { sourceSchoolId }) => {
    // احذف القالب القديم
    const old = await ctx.db
      .query("classTracks")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", TEMPLATE_ID))
      .collect();
    for (const r of old) await ctx.db.delete(r._id);

    // انسخ البيانات الحالية كقالب
    const source = await ctx.db
      .query("classTracks")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", sourceSchoolId))
      .collect();
    for (const r of source) {
      await ctx.db.insert("classTracks", {
        schoolId: TEMPLATE_ID,
        grade: r.grade,
        className: r.className,
        track: r.track,
      });
    }
    return { saved: source.length };
  },
});

/** استيراد القالب المشترك لمدرسة جديدة */
export const loadFromTemplate = mutation({
  args: { targetSchoolId: v.string(), overwrite: v.optional(v.boolean()) },
  handler: async (ctx, { targetSchoolId, overwrite }) => {
    const template = await ctx.db
      .query("classTracks")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", TEMPLATE_ID))
      .collect();

    if (template.length === 0) {
      throw new Error("لا يوجد قالب مسارات محفوظ.");
    }

    if (overwrite) {
      const existing = await ctx.db
        .query("classTracks")
        .withIndex("by_schoolId", (q) => q.eq("schoolId", targetSchoolId))
        .collect();
      for (const r of existing) await ctx.db.delete(r._id);
    }

    const existing = overwrite ? [] : await ctx.db
      .query("classTracks")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", targetSchoolId))
      .collect();

    const existingKeys = new Set(existing.map((r) => `${r.grade}|${r.className}`));

    let added = 0;
    for (const r of template) {
      if (!existingKeys.has(`${r.grade}|${r.className}`)) {
        await ctx.db.insert("classTracks", {
          schoolId: targetSchoolId,
          grade: r.grade,
          className: r.className,
          track: r.track,
        });
        added++;
      }
    }
    return { added, total: template.length };
  },
});

/** التحقق من وجود قالب مسارات */
export const getTemplateInfo = query({
  args: {},
  handler: async (ctx) => {
    const t = await ctx.db
      .query("classTracks")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", TEMPLATE_ID))
      .collect();
    return { exists: t.length > 0, count: t.length };
  },
});
