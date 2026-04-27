// convex/uploads.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

/* ───── دوال مساعدة ───── */

function cleanHeader(h: string) {
  return h.trim().replace(/\uFEFF/, "");
}

function validateHeaders(
  actual: string[],
  expected: string[],
  fileLabel: string
) {
  if (actual.length !== expected.length) {
    throw new Error(
      `عدد الأعمدة غير صحيح في ملف ${fileLabel}. المتوقع ${expected.length} ولكن الملف يحتوي على ${actual.length}.`
    );
  }

  const mismatched: string[] = [];
  expected.forEach((exp, i) => {
    const got = actual[i] ?? "";
    if (cleanHeader(got) !== cleanHeader(exp)) {
      mismatched.push(
        `عمود ${i + 1}: المتوقع "${exp}" ولكن الموجود "${got}"`
      );
    }
  });

  if (mismatched.length) {
    throw new Error(
      `هناك مشكلة في رؤوس الأعمدة في ملف ${fileLabel}:\n` +
        mismatched.join("\n")
    );
  }
}

async function deleteBySchoolId(
  ctx: any,
  tableName: string,
  schoolId: string
) {
  // Use a while loop to delete ALL records for the given schoolId in batches
  const BATCH = 500;
  let deletedCount = 0;
  let hasMore = true;

  while (hasMore) {
    const records = await ctx.db
      .query(tableName)
      .withIndex("by_schoolId", (q: any) => q.eq("schoolId", schoolId))
      .take(BATCH);

    for (const record of records) {
      await ctx.db.delete(record._id);
    }

    deletedCount += records.length;
    hasMore = records.length === BATCH;
  }
  return deletedCount;
}

/* ───── 1) دروس المواد - ldrws-lmjm.csv ───── */

const LESSONS_HEADERS = [
  "اسم المدرسة",
  "رمز المادة الدراسية",
  "المادة الدراسية",
  "الصف",
  "الشعبة",
  "اسم المعلم",
  "هل المادة مربوطة بالجدول",
  "عدد الدروس",
  "عدد الدروس الظاهرة",
  "عدد الدروس المخفية",
  "عدد الدورس التي تحتوي على أقسام",
  "عدد الدروس التي تحتوي على ملاحظات",
  "عدد الدروس المرتبطة بنتاجات التعلم",
  "عدد الدروس المحسوبة بناء على الشروط السابقة",
  "تاريخ الدرس الحالي",
  "رابط صفحة المادة",
  "رمز المقرر الدراسي",
  "تاريخ انشاء المادة الدراسية",
];

export const uploadLessonsCsv = mutation({
  args: {
    content: v.string(),
    schoolId: v.string(),
  },
  handler: async (ctx, { content, schoolId }) => {
    const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length === 0) throw new Error("الملف فارغ");

    const headers = lines[0].split(",").map(cleanHeader);
    validateHeaders(headers, LESSONS_HEADERS, "الدروس");

    await deleteBySchoolId(ctx, "lessonsAgg", schoolId);

    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (!row.trim()) continue;
      const cols = row.split(",");

      await ctx.db.insert("lessonsAgg", {
        schoolId: schoolId,
        schoolName: cols[0],
        subjectCode: cols[1],
        subjectName: cols[2],
        grade: cols[3],
        section: cols[4],
        teacherName: cols[5],
        isInTimetable: cols[6],
        totalLessons: Number(cols[7] || 0),
        visibleLessons: Number(cols[8] || 0),
        hiddenLessons: Number(cols[9] || 0),
        lessonsWithSections: Number(cols[10] || 0),
        lessonsWithNotes: Number(cols[11] || 0),
        lessonsWithOutcomes: Number(cols[12] || 0),
        computedLessons: Number(cols[13] || 0),
        currentLessonDate: cols[14] || undefined,
        subjectUrl: cols[15],
        courseCode: cols[16],
        subjectCreatedAt: cols[17],
      });
      imported++;
    }

    return { imported };
  },
});

/* ───── 2) تقييمات المواد - ltqyymt-lmjm.csv ───── */

const ASSESSMENTS_HEADERS = [
  "اسم المدرسة",
  "رمز المادة",
  "المادة الدراسية",
  "الصف",
  "الشعبة",
  "إجمالي عدد الطلاب",
  "اسم المعلم",
  "عدد التقييمات",
  "التقييمات المسندة",
  "التقييمات غير المسندة",
  "عدد التسليمات",
  "% نسبة حل التقييمات",
  "عدد التقييمات المرتبطة بنتاجات التعلم",
  "التقييمات المصححة",
  "التقييمات غير المصححة",
  "نسبة إتمام تصحيح التقييم",
  "رابط صفحة التقييمات",
];

export const uploadAssessmentsCsv = mutation({
  args: {
    content: v.string(),
    schoolId: v.string(),
  },
  handler: async (ctx, { content, schoolId }) => {
    const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length === 0) throw new Error("الملف فارغ");

    const headers = lines[0].split(",").map(cleanHeader);
    validateHeaders(headers, ASSESSMENTS_HEADERS, "التقييمات");

    await deleteBySchoolId(ctx, "assessmentsAgg", schoolId);

    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (!row.trim()) continue;
      const cols = row.split(",");

      await ctx.db.insert("assessmentsAgg", {
        schoolId: schoolId,
        schoolName: cols[0],
        subjectCode: cols[1],
        subjectName: cols[2],
        grade: cols[3],
        section: cols[4],
        totalStudents: Number(cols[5] || 0),
        teacherName: cols[6],
        assessmentsCount: Number(cols[7] || 0),
        assignedAssessments: Number(cols[8] || 0),
        unassignedAssessments: Number(cols[9] || 0),
        submissionsCount: Number(cols[10] || 0),
        solvePercentage: Number(cols[11] || 0),
        assessmentsWithOutcomes: Number(cols[12] || 0),
        correctedAssessments: Number(cols[13] || 0),
        uncorrectedAssessments: Number(cols[14] || 0),
        correctionCompletionPercentage: Number(cols[15] || 0),
        assessmentsUrl: cols[16],
      });
      imported++;
    }

    return { imported };
  },
});

/* ───── 3) لوحة صدارة الطلاب - Sdr-lTlb.csv ───── */

const STUDENT_LB_HEADERS = [
  "اسم اللعبة",
  "اسم المدرسة",
  "كود الطالب",
  "اسم الطالب",
  "الصف",
  "النقاط",
  "game_id",
  "المستوى",
  "كود لوحة الصدارة",
  "تاريخ بداية لوحة الصدارة",
  "رابط صفحة الطالب",
];

export const uploadStudentLeaderboardCsv = mutation({
  args: {
    content: v.string(),
    schoolId: v.string(),
  },
  handler: async (ctx, { content, schoolId }) => {
    const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length === 0) throw new Error("الملف فارغ");

    const headers = lines[0].split(",").map(cleanHeader);
    validateHeaders(headers, STUDENT_LB_HEADERS, "صدارة الطلاب");

    await deleteBySchoolId(ctx, "studentLeaderboards", schoolId);

    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (!row.trim()) continue;
      const cols = row.split(",");

      await ctx.db.insert("studentLeaderboards", {
        schoolId: schoolId,
        gameName: cols[0],
        schoolName: cols[1],
        studentCode: cols[2],
        studentName: cols[3],
        grade: cols[4],
        points: Number(cols[5] || 0),
        gameId: cols[6],
        level: cols[7],
        leaderboardCode: cols[8] || undefined,
        startDate: cols[9] || undefined,
        studentUrl: cols[10],
      });
      imported++;
    }

    return { imported };
  },
});

/* ───── 4) لوحة صدارة المعلمين - Sdr-lm-lmyn.csv ───── */

const TEACHER_LB_HEADERS = [
  "اسم اللعبة",
  "اسم المدرسة",
  "كود المعلم",
  "اسم المعلم",
  "النقاط",
  "المستوى",
  "كود لوحة الصدارة",
  "تاريخ بداية لوحة الصدارة",
  "رابط صفحة المعلم",
  "game_id",
];

export const uploadTeacherLeaderboardCsv = mutation({
  args: {
    content: v.string(),
    schoolId: v.string(),
  },
  handler: async (ctx, { content, schoolId }) => {
    const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length === 0) throw new Error("الملف فارغ");

    const headers = lines[0].split(",").map(cleanHeader);
    validateHeaders(headers, TEACHER_LB_HEADERS, "صدارة المعلمين");

    await deleteBySchoolId(ctx, "teacherLeaderboards", schoolId);

    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (!row.trim()) continue;
      const cols = row.split(",");

      await ctx.db.insert("teacherLeaderboards", {
        schoolId: schoolId,
        gameName: cols[0],
        schoolName: cols[1],
        teacherCode: cols[2],
        teacherName: cols[3],
        points: Number(cols[4] || 0),
        level: cols[5],
        leaderboardCode: cols[6] || undefined,
        startDate: cols[7] || undefined,
        teacherUrl: cols[8],
        gameId: cols[9],
      });
      imported++;
    }

    return { imported };
  },
});

/* ───── 5) نشاط المستخدمين - nshT-lTlb.csv ───── */

const USER_ACTIVITY_HEADERS = [
  "اسم المدرسة",
  "كود المستخدم",
  "الاسم",
  "منسق التعليم الإلكتروني",
  "مدير / نائب / منسق",
  "مرشد",
  "معلم",
  "طالب",
  "ولي أمر",
  "تاريخ آخر نشاط",
  "رابط صفحة المستخدم",
];

export const uploadUserActivityCsv = mutation({
  args: {
    content: v.string(),
    schoolId: v.string(),
  },
  handler: async (ctx, { content, schoolId }) => {
    const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length === 0) throw new Error("الملف فارغ");

    const headers = lines[0].split(",").map(cleanHeader);
    validateHeaders(headers, USER_ACTIVITY_HEADERS, "نشاط المستخدمين");

    await deleteBySchoolId(ctx, "userActivity", schoolId);

    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (!row.trim()) continue;
      const cols = row.split(",").map((c) => c.trim());

      await ctx.db.insert("userActivity", {
        schoolId: schoolId,
        schoolName: cols[0] ?? "",
        userCode: cols[1] ?? "",
        userName: cols[2] ?? "",
        isLmsCoordinator: cols[3] ?? "",
        isManager: cols[4] ?? "",
        isCounselor: cols[5] ?? "",
        isTeacher: cols[6] ?? "",
        isStudent: cols[7] ?? "",
        isParent: cols[8] ?? "",
        lastActivityAt: cols[9] ?? "",
        userUrl: cols[10] ?? "",
      });
      imported++;
    }

    return { imported };
  },
});

/* ───── 6) تفاعل الطلاب التفصيلي - tf-l-lTlb.csv ───── */

const STUDENT_INTERACTIONS_HEADERS = [
  "LMS ID",
  "الاسم",
  "مؤرشف?",
  "نوع القسم",
  "اسم القسم",
  "الأسم الأول",
  "اللقب",
  "الوقت الكلي",
  "وكيل المستخدم",
  "الاسم",
];

/** مسح تفاعل الطلاب على دفعات صغيرة لتجنب حد القراءات */
export const clearStudentInteractions = mutation({
  args: {
    schoolId: v.string(),
  },
  handler: async (ctx, { schoolId }) => {
    // حذف دفعة من سجلات المدرسة الحالية
    const batch = await ctx.db
      .query("studentInteractions")
      .withIndex("by_schoolId", (q) => q.eq("schoolId", schoolId))
      .take(1000);

    for (const r of batch) await ctx.db.delete(r._id);

    return { deleted: batch.length, hasMore: batch.length === 1000 };
  },
});

/** رفع دفعة من تفاعل الطلاب */
export const uploadStudentInteractionsBatch = mutation({
  args: {
    schoolId: v.string(),
    rows: v.array(
      v.object({
        lmsId: v.string(),
        courseName: v.string(),
        archived: v.string(),
        sectionType: v.string(),
        sectionName: v.string(),
        firstName: v.string(),
        lastName: v.string(),
        totalTime: v.number(),
        userAgent: v.string(),
        schoolName: v.string(),
      })
    ),
  },
  handler: async (ctx, { schoolId, rows }) => {
    for (const row of rows) {
      await ctx.db.insert("studentInteractions", {
        schoolId: schoolId,
        ...row,
      });
    }
    return { inserted: rows.length };
  },
});

/** مسح دفعة من البيانات القديمة (بدون schoolId) من جدول معين */
export const clearLegacyData = mutation({
  args: {
    tableName: v.union(
      v.literal("lessonsAgg"),
      v.literal("assessmentsAgg"),
      v.literal("studentLeaderboards"),
      v.literal("teacherLeaderboards"),
      v.literal("userActivity")
    ),
  },
  handler: async (ctx, { tableName }) => {
    const batch = await ctx.db
      .query(tableName)
      .withIndex("by_schoolId", (q: any) => q.eq("schoolId", undefined))
      .take(1000);
    for (const r of batch) await ctx.db.delete(r._id);
    return { deleted: batch.length, hasMore: batch.length === 1000 };
  },
});

/** مسح كل بيانات مدرسة معينة من جميع الجداول (دفعة) */
export const clearAllSchoolData = mutation({
  args: {
    schoolId: v.string(),
    tableName: v.union(
      v.literal("lessonsAgg"),
      v.literal("assessmentsAgg"),
      v.literal("studentLeaderboards"),
      v.literal("teacherLeaderboards"),
      v.literal("userActivity"),
      v.literal("studentInteractions")
    ),
  },
  handler: async (ctx, { schoolId, tableName }) => {
    const BATCH = 200;

    // حذف دفعة من السجلات المرتبطة بالمدرسة أولاً
    const withId = await ctx.db
      .query(tableName)
      .withIndex("by_schoolId", (q: any) => q.eq("schoolId", schoolId))
      .take(BATCH);
    for (const r of withId) await ctx.db.delete(r._id);

    if (withId.length > 0) {
      return { deleted: withId.length, hasMore: true };
    }

    // بعد ما تنتهي سجلات المدرسة، امسح القديمة بدون schoolId
    const withoutId = await ctx.db
      .query(tableName)
      .withIndex("by_schoolId", (q: any) => q.eq("schoolId", undefined))
      .take(BATCH);
    for (const r of withoutId) await ctx.db.delete(r._id);

    return {
      deleted: withoutId.length,
      hasMore: withoutId.length === BATCH,
    };
  },
});
