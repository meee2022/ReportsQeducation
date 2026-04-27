// هذه الصفحة تعرض بيانات المدرسة الحالية فقط بناءً على currentSchoolId
import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  FileSpreadsheet,
  ExternalLink,
  Users,
  CheckCircle,
  Clock,
  Loader2,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Award,
} from "lucide-react";
import { AppLayout } from "@/components/layout";
import { EmptyState } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CSSBarChart } from "@/components/charts/CSSBarChart";
import { CSSDonutChart } from "@/components/charts/CSSDonutChart";
import { useCurrentSchool } from "@/utils/useCurrentSchool";

const MAROON = "#7f1d1d";
const PIE_COLORS = ["#16a34a", MAROON, "#1d4ed8"];
const PAGE_SIZE = 15;

/* نسبة → لون */
const pctColor = (v) => v >= 90 ? "#16a34a" : v >= 70 ? "#ca8a04" : "#dc2626";
const pctBg = (v) => v >= 90 ? "#f0fdf4" : v >= 70 ? "#fefce8" : "#fef2f2";
const pctMark = (v) => v >= 90 ? "✓" : v >= 70 ? "⚠" : "✗";

/* بطاقة إحصاء */
const SCard = ({ label, value, sub, icon: Icon, accent = MAROON }) => (
  <div className="rounded-xl border bg-white shadow-sm p-4 flex items-center gap-3"
    style={{ borderRight: `4px solid ${accent}` }}>
    <div className="rounded-lg p-2.5 flex-shrink-0" style={{ background: `${accent}18` }}>
      <Icon className="h-5 w-5" style={{ color: accent }} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
      <p className="text-xl font-extrabold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  </div>
);

/* شريط نسبة */
const PctBar = ({ value }) => (
  <div className="flex items-center gap-1.5">
    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, value)}%`, background: pctColor(value) }} />
    </div>
    <span className="text-xs font-bold tabular-nums" style={{ color: pctColor(value) }}>
      {Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 1 })}%
    </span>
  </div>
);

const AssessmentsPage = () => {
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);

  const { schoolId } = useCurrentSchool();

  const assessmentsAgg = useQuery(api.assessmentsAgg.list, { schoolId });
  const lessonsAgg = useQuery(api.lessonsAgg.list, { schoolId });

  const assessments = useMemo(() => assessmentsAgg || [], [assessmentsAgg]);

  const schools = useMemo(() => [...new Set(assessments.map(a => a.schoolName))].filter(Boolean), [assessments]);
  const grades = useMemo(() => [...new Set(assessments.map(a => a.grade))].filter(Boolean).sort(), [assessments]);
  const sections = useMemo(() => [...new Set(assessments.map(a => a.section))].filter(Boolean).sort(), [assessments]);
  const subjects = useMemo(() => [...new Set(assessments.map(a => a.subjectName))].filter(Boolean).sort(), [assessments]);

  const filteredAssessments = useMemo(() => assessments
    .filter(a => schoolFilter === "all" || a.schoolName === schoolFilter)
    .filter(a => gradeFilter === "all" || a.grade === gradeFilter)
    .filter(a => sectionFilter === "all" || a.section === sectionFilter)
    .filter(a => subjectFilter === "all" || a.subjectName === subjectFilter),
    [assessments, schoolFilter, gradeFilter, sectionFilter, subjectFilter]);

  const stats = useMemo(() => {
    const totalAssessments = filteredAssessments.reduce((s, a) => s + (a.assessmentsCount || 0), 0);
    const totalSubmissions = filteredAssessments.reduce((s, a) => s + (a.submissionsCount || 0), 0);
    const correctedAssessments = filteredAssessments.reduce((s, a) => s + (a.correctedAssessments || 0), 0);
    const assessmentsWithOutcomes = filteredAssessments.reduce((s, a) => s + (a.assessmentsWithOutcomes || 0), 0);

    const avgSolveRate = filteredAssessments.length > 0
      ? filteredAssessments.reduce((s, a) => s + (a.solvePercentage || 0), 0) / filteredAssessments.length
      : 0;

    const corrRows = filteredAssessments.filter(a => (a.correctionCompletionPercentage || 0) > 0);
    const avgCorrectionRate = corrRows.length > 0
      ? corrRows.reduce((s, a) => s + (a.correctionCompletionPercentage || 0), 0) / corrRows.length
      : 0;

    const outcomesRatio = totalAssessments > 0
      ? (assessmentsWithOutcomes / totalAssessments) * 100
      : 0;

    return { totalAssessments, totalSubmissions, correctedAssessments, avgSolveRate, avgCorrectionRate, outcomesRatio };
  }, [filteredAssessments]);

  const topSubjects = useMemo(() => {
    const map = {};
    filteredAssessments.forEach(a => {
      const s = a.subjectName || "غير محدد";
      if (!map[s]) map[s] = { subjectName: s, totalAssessments: 0, totalSubmissions: 0 };
      map[s].totalAssessments += (a.assessmentsCount || 0);
      map[s].totalSubmissions += (a.submissionsCount || 0);
    });
    return Object.values(map)
      .sort((a, b) => b.totalAssessments - a.totalAssessments)
      .slice(0, 10)
      .map(s => ({ ...s, shortName: s.subjectName.length > 18 ? s.subjectName.slice(0, 16) + "…" : s.subjectName }));
  }, [filteredAssessments]);

  const correctionDist = useMemo(() => [
    { name: "مصححة بالكامل", value: filteredAssessments.filter(a => (a.correctionCompletionPercentage || 0) === 100).length },
    { name: "مصححة جزئياً", value: filteredAssessments.filter(a => (a.correctionCompletionPercentage || 0) > 0 && (a.correctionCompletionPercentage || 0) < 100).length },
    { name: "غير مصححة", value: filteredAssessments.filter(a => (a.correctionCompletionPercentage || 0) === 0).length },
  ], [filteredAssessments]);

  const teachersWithIssues = useMemo(() =>
    filteredAssessments
      .filter(a => (a.solvePercentage || 0) < 30 || ((a.correctionCompletionPercentage || 0) < 50 && (a.submissionsCount || 0) > 0))
      .slice(0, 5),
    [filteredAssessments]);

  const visibleAssessments = showAll ? filteredAssessments : filteredAssessments.slice(0, PAGE_SIZE);

  const toAr = (n) => Number(n || 0).toLocaleString("en-US");
  const pct = (n) => `${Number(n || 0).toFixed(1)}%`;

  if (assessmentsAgg === undefined || lessonsAgg === undefined) {
    return (
      <AppLayout title="التقييمات">
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: MAROON }} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="التقييمات">
      <div className="space-y-5 px-4 md:px-6" dir="rtl">

        {/* ── العنوان ── */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5" style={{ background: `${MAROON}18` }}>
            <FileSpreadsheet className="h-6 w-6" style={{ color: MAROON }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">التقييمات</h1>
            <p className="text-sm text-slate-500">عرض وتحليل شامل لبيانات التقييمات والأداء</p>
          </div>
        </div>

        {/* ── بطاقات الإحصاء ── */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <SCard label="إجمالي التقييمات" value={toAr(stats.totalAssessments)} icon={FileSpreadsheet} accent={MAROON} />
          <SCard label="إجمالي التسليمات" value={toAr(stats.totalSubmissions)} icon={Users} accent="#1d4ed8" />
          <SCard label="متوسط نسبة الحل" value={pct(stats.avgSolveRate)} icon={CheckCircle} accent="#16a34a" />
          <SCard label="متوسط نسبة التصحيح" value={pct(stats.avgCorrectionRate)} icon={Clock} accent="#ca8a04" />
          <SCard label="نسبة ربط المخرجات" value={pct(stats.outcomesRatio)} icon={Award} accent="#6d28d9" />
        </div>

        {/* ── المخططات ── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `2px solid ${MAROON}20` }}>
              <div className="rounded-lg p-1.5" style={{ background: `${MAROON}18` }}>
                <BarChart3 className="h-4 w-4" style={{ color: MAROON }} />
              </div>
              <span className="font-bold text-slate-700 text-sm">أعلى 10 مواد حسب عدد التقييمات</span>
            </div>
            <div className="p-3">
              {topSubjects.length > 0 ? (
                <CSSBarChart
                  data={topSubjects.map((s) => ({
                    label: s.subjectName,
                    value: s.totalAssessments,
                    color: MAROON,
                  }))}
                  unit=" تقييم"
                  maxRows={10}
                />
              ) : <EmptyState title="لا توجد بيانات" description="لم يتم العثور على تقييمات" />}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `2px solid ${MAROON}20` }}>
              <div className="rounded-lg p-1.5" style={{ background: `${MAROON}18` }}>
                <TrendingUp className="h-4 w-4" style={{ color: MAROON }} />
              </div>
              <span className="font-bold text-slate-700 text-sm">حالة التصحيح</span>
            </div>
            <div className="p-3" style={{ minHeight: 280 }}>
              <CSSDonutChart
                data={correctionDist.map((d, i) => ({
                  label: d.name,
                  value: d.value,
                  color: PIE_COLORS[i],
                }))}
                size={180}
                thick={32}
              />
            </div>
          </div>
        </div>

        {/* ── تنبيه المعلمين ── */}
        {teachersWithIssues.length > 0 && (
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden"
            style={{ borderRight: `4px solid #ca8a04` }}>
            <div className="px-4 py-3 flex items-center gap-2 bg-amber-50 border-b border-amber-100">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="font-bold text-amber-800 text-sm">
                تنبيه: معلمون يحتاجون متابعة ({teachersWithIssues.length})
              </span>
            </div>
            <div className="p-3 space-y-2">
              {teachersWithIssues.map((t, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{t.teacherName}</p>
                    <p className="text-xs text-slate-500">{t.subjectName} — {t.grade}/{t.section}</p>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="font-bold" style={{ color: pctColor(t.solvePercentage) }}>
                      نسبة الحل: {pct(t.solvePercentage)}
                    </span>
                    <span className="font-bold" style={{ color: pctColor(t.correctionCompletionPercentage) }}>
                      نسبة التصحيح: {pct(t.correctionCompletionPercentage)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── الفلاتر ── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3"
          style={{ borderRight: `4px solid #6366f1` }}>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">المدرسة</label>
              <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                <SelectTrigger className="w-44 rounded-lg border-slate-300"><SelectValue placeholder="جميع المدارس" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المدارس</SelectItem>
                  {schools.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">الصف</label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-32 rounded-lg border-slate-300"><SelectValue placeholder="جميع الصفوف" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الصفوف</SelectItem>
                  {grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">الشعبة</label>
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-28 rounded-lg border-slate-300"><SelectValue placeholder="جميع الشعب" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الشعب</SelectItem>
                  {sections.map(s => <SelectItem key={s} value={s}>الشعبة {s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">المادة</label>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-40 rounded-lg border-slate-300"><SelectValue placeholder="جميع المواد" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المواد</SelectItem>
                  {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(schoolFilter !== "all" || gradeFilter !== "all" || sectionFilter !== "all" || subjectFilter !== "all") && (
              <button
                onClick={() => { setSchoolFilter("all"); setGradeFilter("all"); setSectionFilter("all"); setSubjectFilter("all"); }}
                className="rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-slate-50 self-end"
                style={{ borderColor: MAROON, color: MAROON }}>
                إعادة تعيين
              </button>
            )}
            <div className="self-end text-xs text-slate-400 mr-auto">
              {toAr(filteredAssessments.length)} سجل
            </div>
          </div>
        </div>

        {/* ── جدول التقييمات ── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ background: MAROON }}>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-white" />
              <span className="font-bold text-white text-sm">
                جدول التقييمات — {toAr(filteredAssessments.length)} سجل
              </span>
            </div>
            {filteredAssessments.length > PAGE_SIZE && (
              <button onClick={() => setShowAll(v => !v)}
                className="text-xs font-semibold text-white/80 hover:text-white transition-colors">
                {showAll ? "عرض أقل ▲" : `عرض المزيد (${toAr(filteredAssessments.length - PAGE_SIZE)} إضافي) ▼`}
              </button>
            )}
          </div>

          {visibleAssessments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-sm" dir="rtl">
                <colgroup>
                  <col style={{ width: "4%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "7%" }} />
                </colgroup>
                <thead>
                  <tr style={{ background: "#fef2f2" }}>
                    <th className="px-2 py-2.5 text-center text-xs font-bold text-red-900 border-b border-red-200">#</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold text-red-900 border-b border-red-200">المادة</th>
                    <th className="px-3 py-2.5 text-center text-xs font-bold text-red-900 border-b border-red-200">الصف / الشعبة</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold text-red-900 border-b border-red-200">المعلم</th>
                    <th className="px-2 py-2.5 text-center text-xs font-bold text-red-900 border-b border-red-200">الطلاب</th>
                    <th className="px-2 py-2.5 text-center text-xs font-bold text-red-900 border-b border-red-200">التقييمات</th>
                    <th className="px-2 py-2.5 text-center text-xs font-bold text-red-900 border-b border-red-200">التسليمات</th>
                    <th className="px-3 py-2.5 text-center text-xs font-bold text-red-900 border-b border-red-200">نسبة الحل</th>
                    <th className="px-3 py-2.5 text-center text-xs font-bold text-red-900 border-b border-red-200">نسبة التصحيح</th>
                    <th className="px-2 py-2.5 text-center text-xs font-bold text-red-900 border-b border-red-200">رابط</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAssessments.map((a, i) => {
                    const solve = a.solvePercentage || 0;
                    const corr = a.correctionCompletionPercentage || 0;
                    const rowBg = (solve < 30 || corr < 50) && (a.submissionsCount || 0) > 0
                      ? "#fffbeb"
                      : i % 2 === 0 ? "#fff" : "#f8fafc";
                    return (
                      <tr key={a._id || i} className="border-b border-slate-100"
                        style={{ background: rowBg }}>
                        <td className="px-2 py-2 text-center text-slate-400 text-xs">{i + 1}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800 text-xs truncate">{a.subjectName}</td>
                        <td className="px-3 py-2 text-center">
                          <span className="inline-flex items-center gap-1">
                            <span className="rounded-md px-1.5 py-0.5 text-xs font-bold text-white" style={{ background: MAROON }}>{a.grade}</span>
                            <span className="rounded-md px-1.5 py-0.5 text-xs font-semibold border border-slate-300 text-slate-600">{a.section}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600 text-xs truncate">{a.teacherName}</td>
                        <td className="px-2 py-2 text-center text-xs font-semibold text-slate-700">{toAr(a.totalStudents)}</td>
                        <td className="px-2 py-2 text-center">
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
                            style={{ background: `${MAROON}18`, color: MAROON }}>
                            {toAr(a.assessmentsCount)}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center text-xs text-slate-600">{toAr(a.submissionsCount)}</td>
                        <td className="px-3 py-2"><PctBar value={solve} /></td>
                        <td className="px-3 py-2"><PctBar value={corr} /></td>
                        <td className="px-2 py-2 text-center">
                          {a.assessmentsUrl
                            ? <a href={a.assessmentsUrl} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-xs font-semibold border transition-colors hover:bg-slate-50"
                              style={{ borderColor: "#fca5a5", color: MAROON }}>
                              <ExternalLink className="h-3 w-3" /> فتح
                            </a>
                            : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8">
              <EmptyState title="لا توجد تقييمات" description="يرجى رفع ملف التقييمات المجمعة أولاً" />
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
};

export default AssessmentsPage;
