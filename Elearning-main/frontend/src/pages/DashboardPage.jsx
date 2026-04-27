// هذه الصفحة تعرض بيانات المدرسة الحالية فقط بناءً على currentSchoolId
import React, { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Link } from "react-router-dom";
import {
  BookOpen, FileText, Users, GraduationCap, TrendingUp,
  BarChart3, Activity, Loader2, AlertTriangle, ArrowLeft,
  Award, Star, Medal, Crown, Flame, CheckCircle2, XCircle,
  AlertCircle, ChevronRight
} from "lucide-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCurrentSchool } from "@/utils/useCurrentSchool";
import { StatCard } from "@/components/dashboard/StatCard";
import { LeaderboardCard } from "@/components/dashboard/LeaderboardCard";
import { RadarPerformanceChart, SubjectCompletionChart, pctColor } from "@/components/dashboard/PerformanceCharts";
import { parseLevelNum } from "@/utils/levelUtils";

const toAr = (n) => Number(n || 0).toLocaleString("en-US");

const DashboardPage = () => {
  const { schoolId, schoolName } = useCurrentSchool();

  const lessonsAgg = useQuery(api.lessonsAgg.list, { schoolId });
  const assessmentsAgg = useQuery(api.assessmentsAgg.list, { schoolId });
  const studentLeaderboards = useQuery(api.studentLeaderboards.list, { schoolId });
  const teacherLeaderboards = useQuery(api.teacherLeaderboards.list, { schoolId });

  /* ── إحصائيات عامة ── */
  const stats = useMemo(() => {
    const totalLessons = lessonsAgg?.reduce((s, l) => s + (l.totalLessons || 0), 0) || 0;
    const visibleLessons = lessonsAgg?.reduce((s, l) => s + (l.visibleLessons || 0), 0) || 0;
    const withOutcomes = lessonsAgg?.reduce((s, l) => s + (l.lessonsWithOutcomes || 0), 0) || 0;
    const totalAssessments = assessmentsAgg?.reduce((s, a) => s + (a.assessmentsCount || 0), 0) || 0;
    const totalSubmissions = assessmentsAgg?.reduce((s, a) => s + (a.submissionsCount || 0), 0) || 0;

    // إحصاء المواد الفريدة
    const uniqueSubjects = new Set(lessonsAgg?.map(l => l.subjectName).filter(Boolean)).size;

    // إحصاء المعلمين الفعالين المذكورين في الدروس
    const uniqueTeachers = new Set(lessonsAgg?.map(l => l.teacherName).filter(Boolean)).size;

    // إحصاء عدد الطلاب الفريدين من لوحة الصدارة (بدلاً من تراكم تقييمات كل مادة)
    const totalStudents = new Set(studentLeaderboards?.map(s => s.studentCode || s.studentName).filter(Boolean)).size || 0;

    const outcomesRatio = totalLessons > 0 ? Math.min(100, Math.round((withOutcomes / totalLessons) * 100)) : 0;

    // حساب ملخص التقييمات الشاملة (لأنه لا يوجد عمود تواريخ لمعرفة "آخر أسبوع" سيتم استخدام الإجمالي)
    const solveRate = assessmentsAgg?.length > 0
      ? Math.round(assessmentsAgg.reduce((s, a) => s + (a.solvePercentage || 0), 0) / assessmentsAgg.length) : 0;

    const correctionRate = (() => {
      const f = assessmentsAgg?.filter(a => (a.correctionCompletionPercentage || 0) > 0) || [];
      return f.length > 0 ? Math.round(f.reduce((s, a) => s + a.correctionCompletionPercentage, 0) / f.length) : 0;
    })();

    return {
      totalLessons, visibleLessons, withOutcomes, outcomesRatio,
      totalAssessments, totalSubmissions, uniqueTeachers, totalStudents, uniqueSubjects,
      solveRate, correctionRate,
    };
  }, [lessonsAgg, assessmentsAgg, studentLeaderboards]);

  /* ── أفضل معلم لكل قسم (مادة) ── */
  const bestByDept = useMemo(() => {
    if (!lessonsAgg?.length) return [];
    const deptMap = {};
    lessonsAgg.forEach(l => {
      const dept = l.subjectName || "غير محدد";
      const teacher = l.teacherName;
      if (!teacher) return;
      if (!deptMap[dept]) deptMap[dept] = {};
      if (!deptMap[dept][teacher]) deptMap[dept][teacher] = { visible: 0, required: 0, total: 0 };
      deptMap[dept][teacher].visible += (l.visibleLessons || 0);
      deptMap[dept][teacher].required += (l.totalLessons || 0);
      deptMap[dept][teacher].total += (l.totalLessons || 0);
    });
    return Object.entries(deptMap).map(([dept, teachers]) => {
      const candidates = Object.entries(teachers)
        .map(([name, d]) => ({
          name,
          pct: d.required > 0 ? Math.min(100, Math.round((d.visible / d.required) * 100)) : 0,
          visible: d.visible, required: d.required,
        }))
        .filter(t => t.pct > 0)
        .sort((a, b) => b.pct - a.pct);
      const best = candidates[0] || null;
      return { dept, best };
    }).filter(d => d.best).sort((a, b) => b.best.pct - a.best.pct);
  }, [lessonsAgg]);

  /* ── أكثر قسم التزاماً ── */
  const topDept = useMemo(() => {
    if (!bestByDept.length) return null;
    const deptScores = {};
    lessonsAgg?.forEach(l => {
      const dept = l.subjectName || "غير محدد";
      if (!deptScores[dept]) deptScores[dept] = { visible: 0, required: 0 };
      deptScores[dept].visible += (l.visibleLessons || 0);
      deptScores[dept].required += (l.totalLessons || 0);
    });
    return Object.entries(deptScores)
      .filter(([, d]) => d.required > 0)
      .map(([dept, d]) => ({ dept, pct: Math.min(100, Math.round((d.visible / d.required) * 100)) }))
      .sort((a, b) => b.pct - a.pct)[0] || null;
  }, [lessonsAgg, bestByDept]);

  /* ── معلمون بحاجة للمتابعة ── */
  const needsAttention = useMemo(() => {
    if (!lessonsAgg?.length) return [];
    const teacherMap = {};
    lessonsAgg.forEach(l => {
      const t = l.teacherName;
      if (!t) return;
      if (!teacherMap[t]) teacherMap[t] = { visible: 0, required: 0, subjects: new Set() };
      teacherMap[t].visible += (l.visibleLessons || 0);
      teacherMap[t].required += (l.totalLessons || 0);
      if (l.subjectName) teacherMap[t].subjects.add(l.subjectName);
    });
    return Object.entries(teacherMap)
      .filter(([, d]) => d.required > 0)
      .map(([name, d]) => ({
        name, visible: d.visible, required: d.required,
        pct: Math.min(100, Math.round((d.visible / d.required) * 100)),
        subjects: [...d.subjects].join("، "),
      }))
      .filter(t => t.pct < 60)
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 5);
  }, [lessonsAgg]);

  /* ── أفضل 5 معلم وطالب في الصدارة (تم تعديلها لـ 5 كما طلب المستخدم) ── */
  const topStudents = useMemo(() =>
    studentLeaderboards?.length
      ? [...studentLeaderboards].sort((a, b) => parseLevelNum(b.level) - parseLevelNum(a.level) || (b.points || 0) - (a.points || 0)).slice(0, 5)
      : [], [studentLeaderboards]);

  const topTeachers = useMemo(() =>
    teacherLeaderboards?.length
      ? [...teacherLeaderboards].sort((a, b) => parseLevelNum(b.level) - parseLevelNum(a.level) || (b.points || 0) - (a.points || 0)).slice(0, 5)
      : [], [teacherLeaderboards]);

  /* ── بيانات الشارتات ── */
  const radarData = [
    { metric: "اكتمال الدروس", value: stats.visibleLessons && lessonsAgg ? Math.min(100, Math.round((stats.visibleLessons / Math.max(stats.totalLessons, 1)) * 100)) : 0 },
    { metric: "مخرجات الدروس", value: stats.outcomesRatio },
    { metric: "نسبة حل التقييمات", value: stats.solveRate },
    { metric: "تصحيح التقييمات", value: stats.correctionRate },
  ];

  const subjectChartData = useMemo(() => {
    if (!lessonsAgg?.length) return [];
    const map = {};
    lessonsAgg.forEach(l => {
      const s = l.subjectName || "غير محدد";
      if (!map[s]) map[s] = { name: s, visible: 0, required: 0 };
      map[s].visible += (l.visibleLessons || 0);
      map[s].required += (l.totalLessons || 0);
    });
    return Object.values(map)
      .map(d => ({ ...d, pct: d.required > 0 ? Math.min(100, Math.round((d.visible / d.required) * 100)) : 0 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 8);
  }, [lessonsAgg]);

  const isLoading = lessonsAgg === undefined && assessmentsAgg === undefined;
  const hasData = !!(lessonsAgg?.length || assessmentsAgg?.length || teacherLeaderboards?.length);

  // إذا لم يتم تعريف كود المدرسة، اطلب من المستخدم إضافته
  if (!schoolId) {
    return (
      <AppLayout title="نظرة عامة">
        <div className="flex h-96 items-center justify-center p-6 text-center">
          <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-red-800 mb-2">هوية المدرسة غير محددة</h2>
            <p className="text-sm text-red-600 mb-6">لا يمكن عرض لوحة التحكم قبل إدخال بيانات المدرسة. الرجاء ضبط إعدادات المدرسة.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) return (
    <AppLayout title="نظرة عامة">
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">جاري تحميل بيانات مدرسة {schoolId}...</p>
        </div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title="نظرة عامة">
      <div className="space-y-5 px-4 md:px-6 pb-12" dir="rtl">

        {/* ── Header ── */}
        <div className="rounded-xl bg-gradient-to-l from-rose-900 via-rose-800 to-rose-700 px-6 py-5 text-white shadow-lg"
          style={{ WebkitPrintColorAdjust: "exact" }}>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                {schoolName || "لوحة التحكم"}
              </h1>
              <p className="mt-1 text-sm text-rose-200">
                بيانات المدرسة المشفرة بالرمز <span className="font-mono bg-black/20 px-1 rounded">{schoolId}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
              {[
                { label: "المواد/الكورسات", value: stats.uniqueSubjects, icon: <BookOpen className="h-3.5 w-3.5" /> },
                { label: "المعلمون الفعالون", value: stats.uniqueTeachers, icon: <Users className="h-3.5 w-3.5" /> },
                { label: "الطلاب", value: stats.totalStudents, icon: <GraduationCap className="h-3.5 w-3.5" /> },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur-sm">
                  {b.icon} {toAr(b.value)} {b.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── تنبيه بلا بيانات ── */}
        {!hasData && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">لا توجد بيانات لمدرسة {schoolId}</p>
              <p className="text-sm text-amber-700 mt-0.5">يرجى رفع الملفات من صفحة "رفع الملفات"</p>
            </div>
          </div>
        )}

        {/* ── 4 بطاقات KPI كبيرة ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="إجمالي الدروس" value={toAr(stats.totalLessons)} sub={`${toAr(stats.visibleLessons)} ظاهرة`}
            icon={<BookOpen />} accent="#1d4ed8"
          />
          <StatCard
            label="إجمالي التقييمات" value={toAr(stats.totalAssessments)} sub={`${toAr(stats.totalSubmissions)} تسليم`}
            icon={<FileText />} accent="#6d28d9"
          />
          <StatCard
            label="نسبة اكتمال التقييمات" value={`${stats.solveRate}%`} sub={`متوسط التصحيح: ${stats.correctionRate}%`}
            icon={<Activity />} accent="#ca8a04"
          />
          <StatCard
            label="نسبة اكتمال الدروس" value={`${stats.visibleLessons && stats.totalLessons ? Math.min(100, Math.round((stats.visibleLessons / stats.totalLessons) * 100)) : 0}%`} sub="الدروس الظاهرة"
            icon={<TrendingUp />} accent="#16a34a"
          />
        </div>

        {/* ── أبرز المعلمين والطلاب (لوحات الشرف) ── */}
        <div className="grid gap-4 md:grid-cols-2">
          <LeaderboardCard
            title="أفضل 5 معلمين"
            icon={<Users className="h-4 w-4 text-primary" />}
            items={topTeachers}
            isTeacher={true}
            linkTo="/leaderboards"
          />
          <LeaderboardCard
            title="أفضل 5 طلاب"
            icon={<GraduationCap className="h-4 w-4 text-primary" />}
            items={topStudents}
            isTeacher={false}
            linkTo="/leaderboards"
          />
        </div>

        {/* ── مخطط اكتمال المواد + رادار الأداء ── */}
        <div className="grid gap-4 md:grid-cols-2">
          <SubjectCompletionChart data={subjectChartData} />
          <RadarPerformanceChart data={radarData} />
        </div>

        {/* ── أفضل معلم لكل قسم + معلمون بحاجة متابعة ── */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* أفضل معلم لكل مادة */}
          <Card className="shadow-none">
            <CardHeader className="border-b bg-muted/30 px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <Award className="h-4 w-4 text-primary" /> أفضل معلم لكل مادة (اكتمال الدروس)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {bestByDept.length > 0 ? (
                <div className="divide-y max-h-72 overflow-y-auto">
                  {bestByDept.map(({ dept, best }, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground truncate">{dept}</p>
                        <p className="font-semibold text-sm truncate">{best.name}</p>
                      </div>
                      <div className="flex items-center gap-2 mr-3">
                        <div className="w-20">
                          <Progress value={best.pct} className="h-1.5" />
                        </div>
                        <span className="text-xs font-bold w-10 text-left" style={{ color: pctColor(best.pct) }}>
                          {best.pct}%
                        </span>
                        {best.pct >= 80
                          ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                          : best.pct >= 60
                            ? <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-500" />
                            : <XCircle className="h-4 w-4 flex-shrink-0 text-rose-500" />}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="p-4 text-sm text-muted-foreground">لا توجد بيانات دروس</p>}
            </CardContent>
          </Card>

          {/* معلمون بحاجة متابعة */}
          <Card className="border-rose-200 shadow-none">
            <CardHeader className="border-b bg-rose-50 px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-rose-800">
                <Flame className="h-4 w-4 text-rose-500" />
                معلمون بحاجة متابعة
                {needsAttention.length > 0 && (
                  <Badge className="border-rose-300 bg-rose-100 text-rose-700 text-xs mr-auto">
                    {needsAttention.length} معلم
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {needsAttention.length > 0 ? (
                <div className="divide-y max-h-72 overflow-y-auto">
                  {needsAttention.map((t, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-rose-50/40">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{t.subjects}</p>
                      </div>
                      <div className="flex items-center gap-2 mr-3">
                        <div className="w-20">
                          <Progress value={t.pct} className="h-1.5" />
                        </div>
                        <span className="text-xs font-bold w-10 text-left text-rose-700">{t.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-4 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">جميع المعلمين بنسبة اكتمال جيدة</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── روابط سريعة ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { to: "/teachers-performance", label: "أداء المعلمين", icon: <Users className="h-4 w-4" />, bg: "bg-rose-50 border-rose-200 text-rose-800" },
            { to: "/assessments", label: "التقييمات", icon: <FileText className="h-4 w-4" />, bg: "bg-purple-50 border-purple-200 text-purple-800" },
            { to: "/reports", label: "التقارير", icon: <BarChart3 className="h-4 w-4" />, bg: "bg-blue-50 border-blue-200 text-blue-800" },
            { to: "/leaderboards", label: "لوحة الصدارة", icon: <Award className="h-4 w-4" />, bg: "bg-amber-50 border-amber-200 text-amber-800" },
          ].map(l => (
            <Link key={l.to} to={l.to}
              className={`flex items-center justify-between rounded-xl border p-4 transition hover:shadow-md ${l.bg}`}>
              <div className="flex items-center gap-2 font-semibold text-sm">
                {l.icon} {l.label}
              </div>
              <ArrowLeft className="h-4 w-4 opacity-50" />
            </Link>
          ))}
        </div>

      </div>
    </AppLayout>
  );
};

export default DashboardPage;
