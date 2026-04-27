// convex/subjectsQuota.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// رفع ملف نصاب المواد
export const upload = mutation({
  args: {
    content: v.string(),
    schoolId: v.optional(v.string()),
  },
  handler: async (ctx, { content, schoolId }) => {
    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("stage"));

    // احذف البيانات القديمة لهذه المدرسة فقط (لو schoolId مبعوت)
    let existingQuery = ctx.db.query("subjectsQuota");
    if (schoolId) {
      existingQuery = existingQuery.filter((r) => r.schoolId === schoolId);
    }
    const existing = await existingQuery.collect();
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    for (const line of lines) {
      const [stage, track, grade, subjectName, weeklyQuota] = line.split(",");
      if (!stage || !track || !grade || !subjectName) continue;

      await ctx.db.insert("subjectsQuota", {
        schoolId: schoolId ?? undefined,
        stage,
        track,
        grade,
        subjectName,
        weeklyQuota: Number(weeklyQuota || 0),
      });
    }

    return { imported: lines.length };
  },
});

// استعلام قائمة نصاب المواد
export const list = query({
  args: {
    schoolId: v.optional(v.string()),
  },
  handler: async (ctx, { schoolId }) => {
    if (!schoolId) return [];
    return await ctx.db
      .query("subjectsQuota")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", schoolId))
      .collect();
  },
});

// باقي الـmutations كما هي لكن تضيف schoolId عند الإنشاء
export const updateQuota = mutation({
  args: {
    id: v.id("subjectsQuota"),
    weeklyQuota: v.number(),
  },
  handler: async (ctx, { id, weeklyQuota }) => {
    await ctx.db.patch(id, { weeklyQuota });
  },
});

export const updateSubjectName = mutation({
  args: {
    id: v.id("subjectsQuota"),
    subjectName: v.string(),
  },
  handler: async (ctx, { id, subjectName }) => {
    await ctx.db.patch(id, { subjectName });
  },
});

export const addSubject = mutation({
  args: {
    schoolId: v.optional(v.string()),
    stage: v.string(),
    track: v.string(),
    grade: v.string(),
    subjectName: v.string(),
    weeklyQuota: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("subjectsQuota", {
      schoolId: args.schoolId ?? undefined,
      stage: args.stage,
      track: args.track,
      grade: args.grade,
      subjectName: args.subjectName,
      weeklyQuota: args.weeklyQuota,
    });
  },
});

export const deleteSubject = mutation({
  args: {
    id: v.id("subjectsQuota"),
  },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// schoolId خاص بالقالب المشترك (لا يُستخدم لمدرسة حقيقية)
const TEMPLATE_ID = "__template_secondary__";

/**
 * حفظ نصاب المدرسة الحالية كـ "قالب" مشترك
 * يُستخدم لاحقاً من أي مدرسة ثانوية جديدة
 */
export const saveAsTemplate = mutation({
  args: {
    sourceSchoolId: v.string(),
  },
  handler: async (ctx, { sourceSchoolId }) => {
    // احذف القالب القديم أولاً
    const oldTemplate = await ctx.db
      .query("subjectsQuota")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", TEMPLATE_ID))
      .collect();
    for (const r of oldTemplate) await ctx.db.delete(r._id);

    // انسخ بيانات المدرسة الحالية كقالب
    const source = await ctx.db
      .query("subjectsQuota")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", sourceSchoolId))
      .collect();

    for (const r of source) {
      await ctx.db.insert("subjectsQuota", {
        schoolId: TEMPLATE_ID,
        stage: r.stage,
        track: r.track,
        grade: r.grade,
        subjectName: r.subjectName,
        weeklyQuota: r.weeklyQuota,
      });
    }

    return { saved: source.length };
  },
});

/**
 * استيراد القالب المشترك إلى مدرسة جديدة
 */
export const loadFromTemplate = mutation({
  args: {
    targetSchoolId: v.string(),
    overwrite: v.optional(v.boolean()),
  },
  handler: async (ctx, { targetSchoolId, overwrite }) => {
    const template = await ctx.db
      .query("subjectsQuota")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", TEMPLATE_ID))
      .collect();

    if (template.length === 0) {
      throw new Error("لا يوجد قالب محفوظ. يرجى حفظ القالب أولاً من مدرسة مرجعية.");
    }

    if (overwrite) {
      const existing = await ctx.db
        .query("subjectsQuota")
        .withIndex("by_schoolId", (q) => q.eq("schoolId", targetSchoolId))
        .collect();
      for (const r of existing) await ctx.db.delete(r._id);
    }

    const existing = overwrite ? [] : await ctx.db
      .query("subjectsQuota")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", targetSchoolId))
      .collect();

    const existingKeys = new Set(
      existing.map((r) => `${r.track}|${r.grade}|${r.subjectName}`)
    );

    let added = 0;
    for (const r of template) {
      const key = `${r.track}|${r.grade}|${r.subjectName}`;
      if (!existingKeys.has(key)) {
        await ctx.db.insert("subjectsQuota", {
          schoolId: targetSchoolId,
          stage: r.stage,
          track: r.track,
          grade: r.grade,
          subjectName: r.subjectName,
          weeklyQuota: r.weeklyQuota,
        });
        added++;
      }
    }

    return { added, total: template.length };
  },
});

/** التحقق من وجود قالب محفوظ */
export const getTemplateInfo = query({
  args: {},
  handler: async (ctx) => {
    const template = await ctx.db
      .query("subjectsQuota")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", TEMPLATE_ID))
      .collect();
    return { exists: template.length > 0, count: template.length };
  },
});
