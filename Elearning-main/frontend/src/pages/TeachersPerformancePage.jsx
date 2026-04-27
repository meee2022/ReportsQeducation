// هذه الصفحة تعرض بيانات المدرسة الحالية فقط بناءً على currentSchoolId
// src/pages/TeachersPerformancePage.jsx
import React, { useState, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { usePersistentDateFilter } from "@/utils/usePersistentDateFilter";
import {
  Users,
  BookOpen,
  Filter as FilterIcon,
  Award,
  BarChart3,
  Calendar,
  Loader2,
  Link as LinkIcon,
  AlertTriangle,
  Info,
  Printer,
  Mail,
} from "lucide-react";

import { AppLayout } from "@/components/layout";
import { EmptyState } from "@/components/common";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { printTeacherReport, printDepartmentReport } from "@/utils/printTeacherReport";
import { EmailDialog } from "@/components/EmailDialog";

import { CSSBarChart } from "@/components/charts/CSSBarChart";
import { CSSDonutChart } from "@/components/charts/CSSDonutChart";

import { api } from "@/convex/_generated/api";
import { useCurrentSchool } from "@/utils/useCurrentSchool";

/* ============== ثوابت عامة ============== */

const PAGE_SIZE = 10;
const BRAND_MAROON = "hsl(345, 65%, 35%)";
const PIE_COLORS = ["hsl(142, 50%, 45%)", "hsl(0, 0%, 70%)"];

const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7;

/* ============== دوال مساعدة عامة ============== */

const getWeeksBetween = (start, end) => {
  if (!start || !end) return 0;

  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;

  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;

  const diffMs = e.getTime() - s.getTime();
  return Math.max(1, Math.ceil(diffMs / ONE_WEEK_MS));
};

const toAr = (n) => Number(n || 0).toLocaleString("en-US");

/* لون الـ Badge بناءً على نسبة الاكتمال */
const completionBadge = (visible, required) => {
  if (!required || required === 0) return "border-slate-200 bg-slate-50 text-slate-700";
  const ratio = visible / required;
  if (ratio >= 1) return "border-emerald-300 bg-emerald-50 text-emerald-800 font-bold";
  if (ratio >= 0.7) return "border-amber-300 bg-amber-50 text-amber-800 font-bold";
  return "border-rose-300 bg-rose-50 text-rose-800 font-bold";
};

/* لون عمود المتبقي */
const remainingBadge = (remaining, required) => {
  if (!required || required === 0) return "border-slate-200 bg-slate-50 text-slate-600";
  if (remaining <= 0) return "border-emerald-300 bg-emerald-50 text-emerald-800";
  const ratio = remaining / required;
  if (ratio <= 0.3) return "border-amber-300 bg-amber-50 text-amber-800";
  return "border-rose-300 bg-rose-50 text-rose-800";
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("en-US");
  } catch {
    return "";
  }
};

const buildClassName = (grade, section) => {
  const g = String(grade || "").trim();
  const s = String(section || "").trim();
  if (!g && !s) return "";
  if (s.includes("-")) return s; // شكل جاهز مثل "11-1"
  return `${g}-${s}`;
};

const norm = (v) => String(v || "").trim();

const normalizeArabic = (s) =>
  String(s ?? "")
    .trim()
    .replace(/أ|إ|آ/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ئ/g, "ي")
    .trim();

/* ============== تحديد القسم من اسم المادة ============== */

const getDepartmentFromSubject = (subjectName) => {
  const name = normalizeArabic(subjectName);
  const map = {
    "التربيه الاسلاميه": "الشرعية",
    "القران الكريم": "الشرعية",
    "حديث": "الشرعية",
    "فقه": "الشرعية",
    "تفسير": "الشرعية",

    "اللغه العربيه": "العربية",
    "قواعد": "العربية",
    "نحو": "العربية",
    "بلاغه": "العربية",
    "ادب": "العربية",

    "التاريخ": "الاجتماعيات",
    "الجغرافيا": "الاجتماعيات",
    "الوطنية": "الاجتماعيات",

    "اللغة الانجليزيه": "الإنجليزية",
    "انجليزي": "الإنجليزية",

    "الرياضيات": "الرياضيات",

    "الفيزياء": "العلوم",
    "الكيمياء": "العلوم",
    "الاحياء": "العلوم",
  };

  // لو لقيت تطابق مباشر
  if (map[name]) return map[name];

  // تطابق يحتوي الكلمة
  if (name.includes("اسلام")) return "الشرعية";
  if (name.includes("عربي")) return "العربية";
  if (name.includes("تاريخ") || name.includes("جغرافيا")) return "الاجتماعيات";
  if (name.includes("انجلي")) return "الإنجليزية";
  if (name.includes("رياض")) return "الرياضيات";
  if (name.includes("فيز") || name.includes("كيم") || name.includes("احيا"))
    return "العلوم";

  return "غير محدد";
};

/* ============== صفحة أداء المعلمين ============== */

const TeachersPerformancePage = () => {
  // فلاتر عليا (مدرسة / قسم / مادة / صف)
  const [filters, setFilters] = useState({
    school: "all",
    department: "all",
    subject: "all",
    grade: "all",
  });

  const [showAll, setShowAll] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  const { fromDate, setFromDate, toDate, setToDate, resetDates } = usePersistentDateFilter("teachers_perf");

  const { schoolId, schoolName: currentSchoolName } = useCurrentSchool();

  /* ----- بيانات من Convex ----- */

  const lessonsAgg = useQuery(api.lessonsAgg.list, { schoolId });
  const activeTerm = useQuery(api.terms.getActive);
  const subjectsQuota = useQuery(api.subjectsQuota.list, { schoolId });
  const classTracks = useQuery(api.classTracks.list, { schoolId });

  const lessons = useMemo(() => lessonsAgg || [], [lessonsAgg]);
  const quotaRows = useMemo(() => subjectsQuota || [], [subjectsQuota]);
  const trackRows = useMemo(() => classTracks || [], [classTracks]);

  /* ----- حساب عدد الأسابيع ----- */

  const termWeeksTotal = activeTerm
    ? getWeeksBetween(activeTerm.startDate, activeTerm.endDate)
    : 0;

  const termWeeksPassed = activeTerm
    ? getWeeksBetween(activeTerm.startDate, new Date())
    : 0;

  const filteredWeeks =
    fromDate && toDate ? getWeeksBetween(fromDate, toDate) : 0;

  const effectiveWeeks =
    filteredWeeks || (termWeeksPassed && termWeeksTotal ? termWeeksPassed : 0);

  /* ----- قوائم المدارس / المواد / الصفوف / الأقسام ----- */

  const schools = useMemo(
    () =>
      [...new Set(lessons.map((t) => t.schoolName))].filter(Boolean).sort(),
    [lessons]
  );

  const subjects = useMemo(
    () =>
      [...new Set(lessons.map((t) => t.subjectName))].filter(Boolean).sort(),
    [lessons]
  );

  const grades = useMemo(
    () => [...new Set(lessons.map((t) => t.grade))].filter(Boolean).sort(),
    [lessons]
  );

  const departments = useMemo(() => {
    const set = new Set();
    lessons.forEach((t) => {
      if (t.subjectName) {
        set.add(getDepartmentFromSubject(t.subjectName));
      }
    });
    return [...set].filter(Boolean).sort();
  }, [lessons]);

  /* ----- فلترة الدروس حسب الفلاتر ----- */

  const filteredLessons = useMemo(() => {
    return lessons
      .filter((t) =>
        filters.school === "all" ? true : t.schoolName === filters.school
      )
      .filter((t) =>
        filters.subject === "all" ? true : t.subjectName === filters.subject
      )
      .filter((t) =>
        filters.grade === "all" ? true : t.grade === filters.grade
      )
      .filter((t) => {
        if (filters.department === "all") return true;
        const dep = getDepartmentFromSubject(t.subjectName);
        return dep === filters.department;
      });
  }, [lessons, filters]);

  /* ----- Index للـ track حسب الصف/الشعبة ----- */

  const trackIndex = useMemo(() => {
    const m = new Map();
    for (const r of trackRows) {
      const key = norm(r.grade) + "::" + norm(r.className);
      m.set(key, r.track);
    }
    return m;
  }, [trackRows]);

  /* ----- جلب نصاب أسبوعي لمادة ----- */

  const getWeeklyQuota = useCallback((grade, subjectName, track) => {
    const g = normalizeArabic(grade);
    const s = normalizeArabic(subjectName);
    const tr = normalizeArabic(track);

    if (!g || !s) {
      return { weeklyQuota: 0, matchedBy: "missing-key" };
    }

    // 1) grade + subject + track
    let hit = quotaRows.find(
      (q) =>
        normalizeArabic(q.grade) === g &&
        normalizeArabic(q.subjectName) === s &&
        normalizeArabic(q.track) === tr
    );
    if (hit) {
      return {
        weeklyQuota: Number(hit.weeklyQuota || 0),
        matchedBy: "grade-subject-track",
      };
    }

    // 2) grade + subject (بدون track)
    hit = quotaRows.find(
      (q) =>
        normalizeArabic(q.grade) === g &&
        normalizeArabic(q.subjectName) === s
    );
    if (hit) {
      return {
        weeklyQuota: Number(hit.weeklyQuota || 0),
        matchedBy: "grade-subject",
      };
    }

    // 3) subject فقط
    hit = quotaRows.find(
      (q) => normalizeArabic(q.subjectName) === s
    );
    if (hit) {
      return {
        weeklyQuota: Number(hit.weeklyQuota || 0),
        matchedBy: "subject-only",
      };
    }

    return { weeklyQuota: 0, matchedBy: "no-match" };
  }, [quotaRows]);

  /* ----- تجميع بيانات المعلمين من الدروس ----- */

  const teachersData = useMemo(() => {
    const map = {};

    filteredLessons.forEach((row) => {
      const teacherName = row.teacherName;
      if (!teacherName) return; // Ignore missing names

      const key = String(teacherName).trim(); // Fix: Group only by teacherName

      if (!map[key]) {
        map[key] = {
          teacherName: key,
          schoolName: row.schoolName,
          totalLessons: 0,
          computedLessons: 0,
          visibleLessons: 0,
          hiddenLessons: 0,
          lessonsWithSections: 0,
          lessonsWithNotes: 0,
          lessonsWithOutcomes: 0,
          linkedToOutcomesCount: 0,
          linkedToScheduleCount: 0,
          lastLessonDate: undefined,
          classes: [],
          weeklyQuotaTotal: 0,
          requiredLessonsTotal: 0,
          hasQuota: false,
          missingClassNameCount: 0,
          missingTrackCount: 0,
          missingQuotaCount: 0,
          subjectOnlyMatchCount: 0,
        };
      }

      const t = map[key];

      const total = Number(row.totalLessons || 0);
      const computed = Number(row.computedLessons || 0);
      const visible = Number(row.visibleLessons || 0);
      const hidden = Number(row.hiddenLessons || 0);
      const withSections = Number(row.lessonsWithSections || 0);
      const withNotes = Number(row.lessonsWithNotes || 0);
      const withOutcomes = Number(row.lessonsWithOutcomes || 0);
      const isInTimetable = row.isInTimetable;
      const date = row.currentLessonDate;

      const className = buildClassName(row.grade, row.section);
      if (!className) t.missingClassNameCount += 1;

      const trackKey = norm(row.grade) + "::" + norm(className);
      const track = trackIndex.get(trackKey);
      if (className && !track) t.missingTrackCount += 1;

      const quota = getWeeklyQuota(row.grade, row.subjectName, track);
      const weeklyQuota = Number(quota.weeklyQuota || 0);
      const requiredForClass =
        weeklyQuota && effectiveWeeks ? weeklyQuota * effectiveWeeks : 0;

      if (weeklyQuota > 0) {
        t.hasQuota = true;
      } else {
        t.missingQuotaCount += 1;
      }

      if (quota.matchedBy === "subject-only") {
        t.subjectOnlyMatchCount += 1;
      }

      t.totalLessons += total;
      t.computedLessons += computed;
      t.visibleLessons += visible;
      t.hiddenLessons += hidden;
      t.lessonsWithSections += withSections;
      t.lessonsWithNotes += withNotes;
      t.lessonsWithOutcomes += withOutcomes;

      if (withOutcomes > 0) t.linkedToOutcomesCount += 1;
      if (isInTimetable) t.linkedToScheduleCount += 1;

      if (!t.lastLessonDate) t.lastLessonDate = date;
      else if (date && new Date(date) > new Date(t.lastLessonDate)) {
        t.lastLessonDate = date;
      }

      t.weeklyQuotaTotal += weeklyQuota;
      t.requiredLessonsTotal += requiredForClass;

      let quotaIssue = "";
      if (!className) quotaIssue = "classTracks (missing className)";
      else if (!track) quotaIssue = "classTracks (missing track)";
      else if (weeklyQuota === 0) quotaIssue = "subjectsQuota (no row)";
      else if (quota.matchedBy === "subject-only")
        quotaIssue = "subjectsQuota (subject-only match)";

      t.classes.push({
        schoolName: row.schoolName,
        teacherName: row.teacherName,
        subjectName: row.subjectName,
        subjectUrl: row.subjectUrl,
        courseCode: row.courseCode,
        subjectCode: row.subjectCode,
        grade: row.grade,
        section: row.section,
        className,
        track,
        isInTimetable,
        currentLessonDate: date,
        totalLessons: total,
        computedLessons: computed,
        visibleLessons: visible,
        hiddenLessons: hidden,
        lessonsWithSections: withSections,
        lessonsWithNotes: withNotes,
        lessonsWithOutcomes: withOutcomes,
        weeklyQuota,
        requiredLessons: requiredForClass,
        quotaMatchedBy: quota.matchedBy,
        quotaIssue,
      });
    });

    return Object.values(map).map((t) => {
      const required = Number(t.requiredLessonsTotal || 0);
      // الدروس المكتملة = الظاهرة فقط (visible) وليس إجمالي الدروس
      const actual = Number(t.visibleLessons || 0);
      const remaining =
        required > 0 ? Math.max(0, required - actual) : 0;

      const outcomesRatio =
        t.totalLessons > 0
          ? Math.round((t.lessonsWithOutcomes / t.totalLessons) * 100)
          : 0;

      const completion =
        required > 0 ? Math.round((actual / required) * 100) : 0;

      let alertLevel = "ok";
      if (!t.hasQuota) alertLevel = "noquota";
      else if (remaining > 0) alertLevel = "warn";

      let quotaReason = "";
      if (!t.hasQuota) {
        const reasons = [];
        if (t.missingClassNameCount > 0)
          reasons.push("missing className (classTracks)");
        if (t.missingTrackCount > 0)
          reasons.push("missing track (classTracks)");
        if (t.missingQuotaCount > 0)
          reasons.push("no quota row (subjectsQuota)");
        quotaReason = reasons.join(" - ");
      } else if (t.subjectOnlyMatchCount > 0) {
        quotaReason = "quota matched by subject only (no grade/track match)";
      }

      return {
        ...t,
        teacherKey: t.teacherName,
        classesCount: t.classes.length,
        remaining,
        completion,
        outcomesRatio,
        alertLevel,
        quotaReason,
      };
    })
      // ترتيب المعلمين
      .sort((a, b) => {
        // 1) noquota فوق
        if (a.alertLevel === "noquota" && b.alertLevel !== "noquota") return -1;
        if (b.alertLevel === "noquota" && a.alertLevel !== "noquota") return 1;

        // 2) حسب المتبقي (desc)
        const ar = Number(a.remaining || 0);
        const br = Number(b.remaining || 0);
        if (br !== ar) return br - ar;

        // 3) حسب إجمالي الدروس (desc)
        return Number(b.totalLessons || 0) - Number(a.totalLessons || 0);
      });
  }, [filteredLessons, effectiveWeeks, trackIndex, getWeeklyQuota]);

  const visibleTeachers = showAll
    ? teachersData
    : teachersData.slice(0, PAGE_SIZE);

  /* ----- إحصائيات عامة ----- */

  const stats = useMemo(() => {
    if (teachersData.length === 0) {
      return {
        totalTeacherRecords: 0,
        totalLessons: 0,
        totalVisible: 0,
        totalHidden: 0,
        teachersNoQuota: 0,
        totalRequired: 0,
        avgCompletion: 0,
        avgOutcomesRatio: 0,
      };
    }

    const totalTeacherRecords = teachersData.length;
    const totalLessons = teachersData.reduce(
      (sum, t) => sum + Number(t.totalLessons || 0),
      0
    );
    const totalVisible = teachersData.reduce(
      (sum, t) => sum + Number(t.visibleLessons || 0),
      0
    );
    const totalHidden = teachersData.reduce(
      (sum, t) => sum + Number(t.hiddenLessons || 0),
      0
    );
    const totalRequired = teachersData.reduce(
      (sum, t) => sum + Number(t.requiredLessonsTotal || 0),
      0
    );
    const avgCompletion =
      totalTeacherRecords === 0
        ? 0
        : Math.round(
          teachersData.reduce(
            (sum, t) => sum + Number(t.completion || 0),
            0
          ) / totalTeacherRecords
        );
    const avgOutcomesRatio =
      totalTeacherRecords === 0
        ? 0
        : Math.round(
          teachersData.reduce(
            (sum, t) => sum + Number(t.outcomesRatio || 0),
            0
          ) / totalTeacherRecords
        );
    const teachersNoQuota = teachersData.filter(
      (t) => t.alertLevel === "noquota"
    ).length;

    return {
      totalTeacherRecords,
      totalLessons,
      totalVisible,
      totalHidden,
      totalRequired,
      avgCompletion,
      avgOutcomesRatio,
      teachersNoQuota,
    };
  }, [teachersData]);

  /* ----- Charts ----- */

  const topTeachersByLessons = useMemo(
    () =>
      teachersData
        .slice()
        .sort(
          (a, b) =>
            Number(b.totalLessons || 0) - Number(a.totalLessons || 0)
        )
        .slice(0, 10)
        .map((t) => ({
          ...t,
          shortName:
            t.teacherName.length > 18
              ? `${t.teacherName.slice(0, 16)}…`
              : t.teacherName,
        })),
    [teachersData]
  );

  const outcomesDistribution = [
    {
      name: "يوجد مخرجات",
      value: teachersData.filter(
        (t) => t.lessonsWithOutcomes > 0
      ).length,
    },
    {
      name: "بدون مخرجات",
      value: teachersData.filter(
        (t) => t.lessonsWithOutcomes === 0
      ).length,
    },
  ];

  /* ----- حالة التحميل ----- */

  if (
    lessonsAgg === undefined ||
    activeTerm === undefined ||
    subjectsQuota === undefined ||
    classTracks === undefined
  ) {
    return (
      <AppLayout title="أداء المعلمين">
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">
              جاري تحميل بيانات أداء المعلمين...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  /* ============== واجهة المستخدم ============== */

  return (
    <AppLayout title="أداء المعلمين">
      <div className="space-y-6" dir="rtl">
        {/* العنوان الأعلى */}
        <div className="mb-2 text-right">
          <h1 className="text-2xl font-bold text-foreground">
            لوحة متابعة أداء المعلمين
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            عرض وتحليل عدد الدروس، ربط المخرجات، والنصاب الأسبوعي لكل معلم.
          </p>
        </div>

        {/* تنبيه فترة التاريخ المختارة */}
        {filteredWeeks > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="flex items-start gap-2 py-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
              <div className="text-sm text-amber-900">
                <div className="font-semibold">
                  تم تطبيق تصفية على الفترة الزمنية.
                </div>
                <div>
                  سيتم احتساب النصاب المطلوب بناءً على{" "}
                  <span className="font-semibold">
                    {toAr(filteredWeeks)} أسبوع
                  </span>{" "}
                  فقط، وليس كامل مدة الفصل.
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* كروت الإحصائيات السريعة */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="المعلمون الفعالون"
            value={toAr(stats.totalTeacherRecords)}
            icon={<Users />}
            accent="#4338ca"
          />
          <StatCard
            label="إجمالي الدروس"
            value={toAr(stats.totalLessons)}
            icon={<BookOpen />}
            accent="#1d4ed8"
          />
          <StatCard
            label="دروس ظاهرة"
            value={toAr(stats.totalVisible)}
            icon={<BookOpen />}
            accent="#16a34a"
          />
          <StatCard
            label="دروس مخفية"
            value={toAr(stats.totalHidden)}
            icon={<BookOpen />}
            accent="#f97316"
          />
          <StatCard
            label="معلمون بدون نصاب"
            value={toAr(stats.teachersNoQuota)}
            icon={<Info />}
            accent="#e11d48"
          />
        </div>

        {/* معلومات الفصل والفترة */}
        <Card>
          <CardContent className="flex flex-wrap items-end justify-between gap-4 py-4">
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">
                  {activeTerm ? activeTerm.name : "لا يوجد فصل نشط"}
                </span>
              </div>
              {activeTerm && (
                <>
                  <div>
                    من{" "}
                    <span className="font-medium">
                      {formatDate(activeTerm.startDate)}
                    </span>{" "}
                    إلى{" "}
                    <span className="font-medium">
                      {formatDate(activeTerm.endDate)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <span>
                      أسابيع الفصل:{" "}
                      <span className="font-semibold">
                        {toAr(termWeeksTotal)}
                      </span>
                    </span>
                    <span>
                      أسابيع منقضية:{" "}
                      <span className="font-semibold">
                        {toAr(termWeeksPassed)}
                      </span>
                    </span>
                    <Badge
                      variant="outline"
                      className="border-slate-200 bg-slate-50 text-slate-800"
                    >
                      الأسابيع المحسوبة: {toAr(effectiveWeeks)}
                    </Badge>
                  </div>
                </>
              )}
            </div>

            {/* اختيار فترة التاريخ */}
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs">من تاريخ</label>
                <input
                  type="date"
                  className="rounded border px-2 py-1 text-sm"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs">إلى تاريخ</label>
                <input
                  type="date"
                  className="rounded border px-2 py-1 text-sm"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetDates}
              >
                مسح الفترة
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* الرسوم البيانية */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* أعلى 10 معلمين في عدد الدروس */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                أكثر المعلمين من حيث عدد الدروس
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topTeachersByLessons.length === 0 ? (
                <EmptyState
                  title="لا توجد بيانات كافية"
                  description="لن يتم عرض الرسم البياني حتى يتوفر معلم واحد على الأقل لديه دروس."
                />
              ) : (
                <CSSBarChart
                  data={topTeachersByLessons.map((t) => ({
                    label: t.teacherName,
                    value: Number(t.totalLessons || 0),
                    color: "hsl(345, 65%, 45%)",
                  }))}
                  unit=" درس"
                  maxRows={10}
                />
              )}
            </CardContent>
          </Card>

          {/* توزيع ربط المخرجات */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5 text-primary" />
                ربط الدروس بالمخرجات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CSSDonutChart
                data={outcomesDistribution.map((d, i) => ({
                  label: d.name,
                  value: d.value,
                  color: i === 0 ? "#16a34a" : "#cbd5e1",
                }))}
                size={200}
                thick={36}
                center={
                  <div className="text-center">
                    <p className="text-lg font-extrabold text-slate-800">{toAr(teachersData.length)}</p>
                    <p className="text-[10px] text-slate-500">معلم</p>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </div>

        {/* الفلاتر (مدرسة / قسم / مادة / صف) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FilterIcon className="h-5 w-5 text-muted-foreground" />
              الفلاتر
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4 py-4">
            {/* المدرسة */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">المدرسة</span>
              <Select
                value={filters.school}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, school: value }))
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {schools.map((school) => (
                    <SelectItem key={school} value={school}>
                      {school}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* القسم */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">القسم</span>
              <Select
                value={filters.department}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, department: value }))
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {departments.map((dep) => (
                    <SelectItem key={dep} value={dep}>
                      {dep}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* المادة */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">المادة</span>
              <Select
                value={filters.subject}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, subject: value }))
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* الصف */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">الصف</span>
              <Select
                value={filters.grade}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, grade: value }))
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {grades.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* جدول المعلمين + طباعة القسم */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>قائمة المعلمين</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  printDepartmentReport(
                    visibleTeachers,
                    filters,
                    {
                      totalTeacherRecords: teachersData.length,
                      totalLessons: stats.totalLessons,
                      totalRequired: stats.totalRequired,
                      avgCompletion: stats.avgCompletion,
                      avgOutcomesRatio: stats.avgOutcomesRatio,
                    },
                    effectiveWeeks
                  )
                }
              >
                <Printer className="ml-2 h-4 w-4" />
                طباعة تقرير القسم / الفلاتر
              </Button>
              {teachersData.length > PAGE_SIZE && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll((v) => !v)}
                >
                  {showAll ? "عرض أقل" : "عرض الكل"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {visibleTeachers.length === 0 ? (
              <EmptyState
                title="لا توجد بيانات للمعلمين"
                description="تحقق من الفلاتر أو الفترة الزمنية المحددة."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border bg-card">
                <Table className="text-right text-xs">
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead className="w-48">المعلم</TableHead>
                      <TableHead>إجمالي الدروس</TableHead>
                      <TableHead>ظاهرة / مخفية</TableHead>
                      <TableHead>مقسمة</TableHead>
                      <TableHead>بملاحظات</TableHead>
                      <TableHead>مرتبطة بمخرجات</TableHead>
                      <TableHead>نصاب أسبوعي (مطلوب)</TableHead>
                      <TableHead>المتبقي</TableHead>
                      <TableHead>إجراءات</TableHead>
                      <TableHead>آخر درس</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleTeachers.map((teacher, index) => {
                      const rank = index + 1;

                      const completion = teacher.requiredLessonsTotal > 0
                        ? (teacher.visibleLessons / teacher.requiredLessonsTotal) * 100 : 0;

                      const statusBadge =
                        teacher.alertLevel === "noquota" ? (
                          <Badge className="border border-slate-200 bg-slate-50 text-slate-700">لا يوجد نصاب</Badge>
                        ) : teacher.remaining <= 0 && teacher.requiredLessonsTotal > 0 ? (
                          <Badge className="border border-emerald-300 bg-emerald-50 text-emerald-800 font-bold">✓ مكتمل</Badge>
                        ) : teacher.remaining > 0 ? (
                          <Badge className={`border font-bold ${completion >= 70 ? "border-amber-300 bg-amber-50 text-amber-800" : "border-rose-300 bg-rose-50 text-rose-800"}`}>
                            متبقي {toAr(teacher.remaining)} درس
                          </Badge>
                        ) : (
                          <Badge className="border border-slate-200 bg-slate-50 text-slate-700">لا يوجد نصاب</Badge>
                        );

                      return (
                        <TableRow
                          key={teacher.teacherKey}
                          className={
                            teacher.alertLevel === "noquota"
                              ? "bg-slate-50 hover:bg-slate-100"
                              : teacher.remaining <= 0 && teacher.requiredLessonsTotal > 0
                                ? "bg-emerald-50/30 hover:bg-emerald-50/60"
                                : completion >= 70
                                  ? "bg-amber-50/30 hover:bg-amber-50/60"
                                  : teacher.remaining > 0
                                    ? "bg-rose-50/30 hover:bg-rose-50/60"
                                    : index % 2 === 0
                                      ? "bg-background hover:bg-muted/40"
                                      : "bg-muted/10 hover:bg-muted/30"
                          }
                        >
                          <TableCell className="font-medium">
                            <span className="text-muted-foreground">{rank}</span>
                          </TableCell>
                          <TableCell className="font-medium">
                            <Button
                              variant="link"
                              className="px-0 text-right font-bold text-primary"
                              onClick={() => setSelectedTeacher(teacher)}
                            >
                              {teacher.teacherName}
                            </Button>
                            <div className="mt-1">{statusBadge}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-semibold">
                              {toAr(teacher.totalLessons)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="text-emerald-700 font-bold">{toAr(teacher.visibleLessons)}</span>
                              <span className="text-muted-foreground">/</span>
                              <span className="text-rose-600">{toAr(teacher.hiddenLessons)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-slate-600">
                              {toAr(teacher.lessonsWithSections)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-slate-600">
                              {toAr(teacher.lessonsWithNotes)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`border-0 bg-transparent px-0 ${teacher.outcomesRatio >= 80 ? "text-emerald-600" : teacher.outcomesRatio >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                                {toAr(teacher.lessonsWithOutcomes)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                ({teacher.outcomesRatio}%)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs space-y-0.5">
                              <span className="text-slate-700 font-semibold">{toAr(teacher.weeklyQuotaTotal)} أسبوعياً</span>
                              <span className="text-muted-foreground">إجمالي المطلوب: {toAr(teacher.requiredLessonsTotal)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`border ${remainingBadge(teacher.remaining, teacher.requiredLessonsTotal)}`}>
                              {teacher.remaining <= 0 ? "✓ مكتمل" : `متبقي ${toAr(teacher.remaining)}`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setSelectedTeacher(teacher)}
                            >
                              <LinkIcon className="h-4 w-4 text-primary" />
                            </Button>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(teacher.lastLessonDate) || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog تفاصيل المعلم الفردي + طباعة معلم */}
        < Dialog
          open={!!selectedTeacher}
          onOpenChange={(open) => !open && setSelectedTeacher(null)}
        >
          <DialogContent className="max-w-6xl" dir="rtl">
            <DialogHeader className="flex items-center justify-between">
              <DialogTitle>
                {selectedTeacher?.teacherName} –{" "}
                {selectedTeacher?.schoolName}
              </DialogTitle>
              <div className="flex gap-2">
                {selectedTeacher && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEmailDialog(true)}
                    >
                      <Mail className="ml-2 h-4 w-4" />
                      إرسال بالبريد
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        printTeacherReport(
                          selectedTeacher,
                          selectedTeacher.classes,
                          effectiveWeeks,
                          currentSchoolName || ""
                        )
                      }
                    >
                      <Printer className="ml-2 h-4 w-4" />
                      طباعة تقرير المعلم
                    </Button>
                  </>
                )}
              </div>
            </DialogHeader>

            {selectedTeacher && (
              <div className="mt-4 space-y-4">
                {/* كروت سريعة للمعلم */}
                <div className="grid gap-3 md:grid-cols-5">
                  <Card>
                    <CardContent className="py-4">
                      <div className="text-xs text-muted-foreground">
                        إجمالي الدروس
                      </div>
                      <div className="text-lg font-bold">
                        {toAr(selectedTeacher.totalLessons)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4">
                      <div className="text-xs text-muted-foreground">
                        دروس ظاهرة
                      </div>
                      <div className="text-lg font-bold">
                        {toAr(selectedTeacher.visibleLessons)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4">
                      <div className="text-xs text-muted-foreground">
                        دروس مخفية
                      </div>
                      <div className="text-lg font-bold">
                        {toAr(selectedTeacher.hiddenLessons)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4">
                      <div className="text-xs text-muted-foreground">
                        النصاب الأسبوعي الكلي
                      </div>
                      <div className="text-lg font-bold">
                        {toAr(selectedTeacher.weeklyQuotaTotal)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4">
                      <div className="text-xs text-muted-foreground">
                        المطلوب / المتبقي
                      </div>
                      <div className="text-lg font-bold">
                        {toAr(selectedTeacher.requiredLessonsTotal)}{" "}
                        <span className="text-rose-700">
                          ({toAr(selectedTeacher.remaining)} متبقي)
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* جدول شعب المعلم */}
                <div className="rounded-lg border bg-card">
                  <div className="border-b bg-muted/30 p-3 font-semibold">
                    تفاصيل الصفوف والشعب
                  </div>
                  <div className="max-h-[430px] overflow-y-auto">
                    <Table className="text-right text-xs">
                      <TableHeader className="sticky top-0 bg-muted/40">
                        <TableRow>
                          <TableHead>المادة</TableHead>
                          <TableHead className="w-16">الصف</TableHead>
                          <TableHead className="w-16">الشعبة</TableHead>
                          <TableHead className="w-24">المسار</TableHead>
                          <TableHead className="w-20">
                            إجمالي الدروس
                          </TableHead>
                          <TableHead className="w-20">ظاهرة</TableHead>
                          <TableHead className="w-20">مخفية</TableHead>
                          <TableHead className="w-20">
                            دروس مقسمة
                          </TableHead>
                          <TableHead className="w-20">
                            دروس بملاحظات
                          </TableHead>
                          <TableHead className="w-22">
                            دروس بمخرجات
                          </TableHead>
                          <TableHead className="w-20">
                            نصاب أسبوعي
                          </TableHead>
                          <TableHead className="w-22">
                            المطلوب
                          </TableHead>
                          <TableHead className="w-22">
                            المتبقي
                          </TableHead>
                          <TableHead className="w-28">في الجدول</TableHead>
                          <TableHead className="w-28">
                            ملاحظات النصاب
                          </TableHead>
                          <TableHead className="w-20">رابط</TableHead>
                          <TableHead className="w-24">
                            آخر درس
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTeacher.classes.map((c, idx) => {
                          const remaining =
                            c.requiredLessons > 0
                              ? Math.max(
                                0,
                                c.requiredLessons - c.totalLessons
                              )
                              : 0;

                          const quotaBadge =
                            c.weeklyQuota > 0 ? (
                              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                {toAr(c.weeklyQuota)}
                              </Badge>
                            ) : (
                              <Badge className="border-rose-200 bg-rose-50 text-rose-700">
                                0
                              </Badge>
                            );

                          const reason =
                            c.quotaIssue ||
                            (c.weeklyQuota === 0
                              ? "لا يوجد نصاب"
                              : c.quotaMatchedBy === "subject-only"
                                ? "نصاب بالمادة فقط (بدون صف/مسار)"
                                : "-");

                          return (
                            <TableRow
                              key={idx}
                              className={
                                c.weeklyQuota === 0
                                  ? "bg-rose-50/30 hover:bg-rose-50/50"
                                  : remaining > 0
                                    ? "bg-amber-50/25 hover:bg-amber-50/45"
                                    : "hover:bg-muted/20"
                              }
                            >
                              <TableCell className="font-medium">
                                {c.subjectName}
                              </TableCell>
                              <TableCell>{c.grade}</TableCell>
                              <TableCell>{c.section}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {c.track || "-"}
                              </TableCell>
                              <TableCell>
                                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                  {toAr(c.totalLessons)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className="border-sky-200 bg-sky-50 text-sky-700">
                                  {toAr(c.visibleLessons)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className="border-rose-200 bg-rose-50 text-rose-700">
                                  {toAr(c.hiddenLessons)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className="border-slate-300 bg-slate-100 text-slate-700">
                                  {toAr(c.lessonsWithSections)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className="border-slate-300 bg-slate-100 text-slate-700">
                                  {toAr(c.lessonsWithNotes)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">
                                  {toAr(c.lessonsWithOutcomes)}
                                </Badge>
                              </TableCell>
                              <TableCell>{quotaBadge}</TableCell>
                              <TableCell>
                                <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">
                                  {toAr(c.requiredLessons)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className="border-rose-200 bg-rose-50 text-rose-700">
                                  {toAr(remaining)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {c.isInTimetable ? "نعم" : "لا"}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {reason && (
                                  <span className="text-rose-700">
                                    {reason}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {c.subjectUrl ? (
                                  <a
                                    href={c.subjectUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-primary underline"
                                  >
                                    <LinkIcon className="h-3 w-3" />
                                    <span className="text-muted-foreground">
                                      فتح
                                    </span>
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatDate(c.currentLessonDate)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* ملاحظات توضيحية */}
                <Card className="border-slate-200 bg-slate-50/40">
                  <CardContent className="py-3">
                    <div className="mb-1 text-sm font-semibold text-slate-800">
                      ملاحظات على ألوان الصفوف:
                    </div>
                    <ul className="list-disc space-y-1 pr-5 text-sm text-slate-700">
                      <li>اللون الوردي: شُعب بدون نصاب محدد.</li>
                      <li>اللون الأصفر: شُعب بها نصاب لكن ما زال هناك دروس متبقية.</li>
                      <li>اللون العادي: الشُعب المكتملة أو بدون مشاكل في النصاب.</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* نافذة البريد الإلكتروني */}
            {selectedTeacher && (
              <EmailDialog
                open={showEmailDialog}
                onClose={() => setShowEmailDialog(false)}
                teacher={selectedTeacher}
              />
            )}
          </DialogContent>
        </Dialog >
      </div >
    </AppLayout >
  );
};

export default TeachersPerformancePage;
