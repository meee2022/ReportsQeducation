// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // دروس المواد - ldrws-lmjm.csv
  lessonsAgg: defineTable({
    schoolId: v.optional(v.string()),
    schoolName: v.string(),
    subjectCode: v.string(),
    subjectName: v.string(),
    grade: v.string(),
    section: v.string(),
    teacherName: v.string(),
    isInTimetable: v.string(),
    totalLessons: v.number(),
    visibleLessons: v.number(),
    hiddenLessons: v.number(),
    lessonsWithSections: v.number(),
    lessonsWithNotes: v.number(),
    lessonsWithOutcomes: v.number(),
    computedLessons: v.number(),
    currentLessonDate: v.optional(v.string()),
    subjectUrl: v.string(),
    courseCode: v.string(),
    subjectCreatedAt: v.string(),
  }).index("by_schoolId", ["schoolId"]),

  // تقييمات المواد - ltqyymt-lmjm.csv
  assessmentsAgg: defineTable({
    schoolId: v.optional(v.string()),
    schoolName: v.string(),
    subjectCode: v.string(),
    subjectName: v.string(),
    grade: v.string(),
    section: v.string(),
    totalStudents: v.number(),
    teacherName: v.string(),
    assessmentsCount: v.number(),
    assignedAssessments: v.number(),
    unassignedAssessments: v.number(),
    submissionsCount: v.number(),
    solvePercentage: v.number(),
    assessmentsWithOutcomes: v.number(),
    correctedAssessments: v.number(),
    uncorrectedAssessments: v.number(),
    correctionCompletionPercentage: v.number(),
    assessmentsUrl: v.string(),
  }).index("by_schoolId", ["schoolId"]),

  // لوحة صدارة الطلاب - Sdr-lTlb.csv
  studentLeaderboards: defineTable({
    schoolId: v.optional(v.string()),
    gameName: v.string(),
    schoolName: v.string(),
    studentCode: v.string(),
    studentName: v.string(),
    grade: v.string(),
    points: v.number(),
    gameId: v.string(),
    level: v.string(),
    leaderboardCode: v.optional(v.string()),
    startDate: v.optional(v.string()),
    studentUrl: v.string(),
  }).index("by_schoolId", ["schoolId"]),

  // لوحة صدارة المعلمين - Sdr-lm-lmyn.csv
  teacherLeaderboards: defineTable({
    schoolId: v.optional(v.string()),
    gameName: v.string(),
    schoolName: v.string(),
    teacherCode: v.string(),
    teacherName: v.string(),
    points: v.number(),
    level: v.string(),
    leaderboardCode: v.optional(v.string()),
    startDate: v.optional(v.string()),
    teacherUrl: v.string(),
    gameId: v.string(),
  }).index("by_schoolId", ["schoolId"]),

  // نشاط المستخدمين - nshT-lTlb.csv
  userActivity: defineTable({
    schoolId: v.optional(v.string()),
    schoolName: v.string(),
    userCode: v.string(),
    userName: v.string(),
    isLmsCoordinator: v.string(),
    isManager: v.string(),
    isCounselor: v.string(),
    isTeacher: v.string(),
    isStudent: v.string(),
    isParent: v.string(),
    lastActivityAt: v.string(),
    userUrl: v.string(),
  }).index("by_schoolId", ["schoolId"]),

  // تفاعل الطلاب التفصيلي - tf-l-lTlb.csv
  studentInteractions: defineTable({
    schoolId: v.optional(v.string()),
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
  }).index("by_schoolId", ["schoolId"]),

  // نصاب المواد (subjects_quota.csv)
  subjectsQuota: defineTable({
    schoolId: v.optional(v.string()),
    stage: v.string(),
    track: v.string(),
    grade: v.string(),
    subjectName: v.string(),
    weeklyQuota: v.number(),
  }).index("by_schoolId", ["schoolId"]),

  // مسارات الشعب (class_tracks.csv)
  classTracks: defineTable({
    schoolId: v.optional(v.string()),
    grade: v.string(),
    className: v.string(),
    track: v.string(),
  }).index("by_schoolId", ["schoolId"]),

  // الفصول الدراسية (terms)
  terms: defineTable({
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
  }).index("by_schoolId", ["schoolId"]),

  // إعدادات النظام العامة
  settings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),
});
