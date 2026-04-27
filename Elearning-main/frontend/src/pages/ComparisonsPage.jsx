// هذه الصفحة تعرض بيانات المدرسة الحالية فقط بناءً على currentSchoolId
import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CheckCircle2, XCircle, AlertCircle, Loader2, TrendingUp, BookOpen, FileText, Users } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Legend
} from "recharts";
import { CSSBarChart } from "@/components/charts/CSSBarChart";
import { useCurrentSchool } from "@/utils/useCurrentSchool";
import { StatCard } from "@/components/dashboard/StatCard";
const pctColor = (v) => v >= 80 ? "#16a34a" : v >= 60 ? "#ca8a04" : "#dc2626";
const pctBg = (v) => v >= 80 ? "#dcfce7" : v >= 60 ? "#fef9c3" : "#fee2e2";
const pctBorder = (v) => v >= 80 ? "#86efac" : v >= 60 ? "#fde047" : "#fca5a5";
const pctIcon = (v) => v >= 80
  ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  : v >= 60
    ? <AlertCircle className="h-4 w-4 text-amber-500" />
    : <XCircle className="h-4 w-4 text-rose-500" />;
const toN = (n) => Number(n || 0).toLocaleString("en-US");

const ComparisonsPage = () => {
  const { schoolId, schoolName } = useCurrentSchool();

  const lessonsAgg = useQuery(api.lessonsAgg.list, { schoolId });
  const assessmentsAgg = useQuery(api.assessmentsAgg.list, { schoolId });

  /* ── تجميع حسب اسم المادة فقط (بدل مادة+صف) ── */
  const subjectData = useMemo(() => {
    const map = {};
    (lessonsAgg || []).forEach(l => {
      const s = l.subjectName || "غير محدد";
      if (!map[s]) map[s] = { subject: s, visible: 0, required: 0, total: 0, outcomes: 0, teachers: new Set() };
      map[s].visible += (l.visibleLessons || 0);
      map[s].required += (l.requiredLessons || 0);
      map[s].total += (l.totalLessons || 0);
      map[s].outcomes += (l.lessonsWithOutcomes || 0);
      if (l.teacherName) map[s].teachers.add(l.teacherName);
    });
    (assessmentsAgg || []).forEach(a => {
      const s = a.subjectName || "غير محدد";
      if (!map[s]) map[s] = { subject: s, visible: 0, required: 0, total: 0, outcomes: 0, teachers: new Set() };
      if (!map[s].asmCount) map[s].asmCount = 0;
      if (!map[s].solveSum) map[s].solveSum = 0;
      if (!map[s].solveN) map[s].solveN = 0;
      map[s].asmCount += (a.assessmentsCount || 0);
      map[s].solveSum += (a.solvePercentage || 0);
      map[s].solveN += 1;
    });
    return Object.values(map).map(d => ({
      subject: d.subject,
      visible: d.visible,
      required: d.required,
      total: d.total,
      outcomes: d.outcomes,
      teachers: d.teachers.size,
      asmCount: d.asmCount || 0,
      completion: d.required > 0
        ? Math.min(100, Math.round((d.visible / d.required) * 100))
        : d.total > 0
          ? Math.min(100, Math.round((d.visible / d.total) * 100))
          : 0,
      outRatio: d.total > 0 ? Math.min(100, Math.round((d.outcomes / d.total) * 100)) : 0,
      solveRate: d.solveN > 0 ? Math.min(100, Math.round(d.solveSum / d.solveN)) : 0,
    })).sort((a, b) => b.completion - a.completion);
  }, [lessonsAgg, assessmentsAgg]);

  /* ── تجميع حسب الصف ── */
  const gradeData = useMemo(() => {
    const map = {};
    (lessonsAgg || []).forEach(l => {
      const g = l.grade || "غير محدد";
      if (!map[g]) map[g] = { grade: g, visible: 0, required: 0, total: 0, teachers: new Set() };
      map[g].visible += (l.visibleLessons || 0);
      map[g].required += (l.requiredLessons || 0);
      map[g].total += (l.totalLessons || 0);
      if (l.teacherName) map[g].teachers.add(l.teacherName);
    });
    return Object.values(map).map(d => ({
      grade: d.grade,
      visible: d.visible,
      required: d.required,
      total: d.total,
      teachers: d.teachers.size,
      completion: d.required > 0
        ? Math.min(100, Math.round((d.visible / d.required) * 100))
        : d.total > 0
          ? Math.min(100, Math.round((d.visible / d.total) * 100))
          : 0,
    })).sort((a, b) => b.completion - a.completion);
  }, [lessonsAgg]);

  /* ── رادار (أعلى 7 مواد بنسبة اكتمال) ── */
  const radarData = useMemo(() =>
    subjectData.slice(0, 7).map(s => ({
      subject: s.subject,
      "اكتمال الدروس": s.completion,
      "مخرجات الدروس": s.outRatio,
      "حل التقييمات": s.solveRate,
    })), [subjectData]);

  const isLoading = lessonsAgg === undefined || assessmentsAgg === undefined;
  if (isLoading) return (
    <AppLayout title="المقارنات">
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </AppLayout>
  );

  const needsWork = subjectData.filter(s => s.completion < 60);
  const onTrack = subjectData.filter(s => s.completion >= 80);

  return (
    <AppLayout title="المقارنات والتحليلات">
      <div className="space-y-5 px-4 md:px-6" dir="rtl">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold">المقارنات والتحليلات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {schoolName ? `${schoolName} — ` : ""}مقارنة أداء المواد والصفوف
          </p>
        </div>

        {/* بطاقات سريعة */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="مواد ملتزمة ≥ 80%"
            value={onTrack.length}
            sub={`من ${subjectData.length} مادة`}
            icon={<CheckCircle2 />}
            accent="#16a34a"
          />
          <StatCard
            label="مواد بحاجة متابعة < 60%"
            value={needsWork.length}
            sub="تستلزم تدخلاً فورياً"
            icon={<AlertCircle />}
            accent="#e11d48"
          />
          <StatCard
            label="إجمالي الدروس"
            value={toN(subjectData.reduce((s, d) => s + d.visible, 0))}
            sub={`من ${toN(subjectData.reduce((s, d) => s + d.required, 0))} مطلوب`}
            icon={<BookOpen />}
            accent="#1d4ed8"
          />
          <StatCard
            label="متوسط الاكتمال"
            value={`${subjectData.length ? Math.round(subjectData.reduce((s, d) => s + d.completion, 0) / subjectData.length) : 0}%`}
            sub="على مستوى المدرسة"
            icon={<TrendingUp />}
            accent="#6d28d9"
          />
        </div>

        <Tabs defaultValue="subjects" dir="rtl">
          <TabsList className="mb-2">
            <TabsTrigger value="subjects">مقارنة المواد</TabsTrigger>
            <TabsTrigger value="grades">مقارنة الصفوف</TabsTrigger>
            <TabsTrigger value="radar">رادار الأداء</TabsTrigger>
          </TabsList>

          {/* ── تبويب المواد ── */}
          <TabsContent value="subjects" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">

              {/* ترتيب المواد حسب الاكتمال */}
              <Card className="shadow-none">
                <CardHeader className="border-b bg-muted/30 px-4 py-3">
                  <CardTitle className="text-sm font-bold">ترتيب المواد حسب اكتمال الدروس</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {subjectData.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20">
                        <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-black
                          ${i === 0 ? "bg-yellow-400 text-yellow-900" : i === 1 ? "bg-slate-400 text-white" : i === 2 ? "bg-orange-400 text-white" : "bg-muted text-muted-foreground"}`}>
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold truncate">{s.subject}</p>
                            <span className="text-xs font-bold mr-2 flex-shrink-0" style={{ color: pctColor(s.completion) }}>
                              {s.completion}%
                            </span>
                          </div>
                          <Progress value={s.completion} className="h-1.5" />
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {toN(s.visible)} / {toN(s.required)} درس · {s.teachers} معلم
                          </p>
                        </div>
                        <div className="flex-shrink-0">{pctIcon(s.completion)}</div>
                      </div>
                    ))}
                    {!subjectData.length && <p className="p-4 text-sm text-muted-foreground">لا توجد بيانات</p>}
                  </div>
                </CardContent>
              </Card>

              {/* مخطط اكتمال الدروس */}
              <Card className="shadow-none">
                <CardHeader className="border-b bg-muted/30 px-4 py-3">
                  <CardTitle className="text-sm font-bold">نسبة الاكتمال حسب المادة</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  {subjectData.length > 0 ? (
                    <CSSBarChart
                      data={subjectData.map((s) => ({
                        label: s.subject,
                        value: s.completion,
                        color: pctColor(s.completion),
                      }))}
                      showPercent
                      unit="%"
                      maxRows={12}
                    />
                  ) : <p className="p-4 text-sm text-muted-foreground">لا توجد بيانات</p>}
                </CardContent>
              </Card>
            </div>

            {/* جدول تفصيلي للمواد */}
            <Card className="shadow-none">
              <CardHeader className="border-b bg-muted/30 px-4 py-3">
                <CardTitle className="text-sm font-bold">جدول تفصيلي للمواد</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" dir="rtl">
                    <thead>
                      <tr className="bg-rose-900 text-white text-xs">
                        <th className="px-3 py-2.5 text-right font-semibold">المادة</th>
                        <th className="px-3 py-2.5 text-center font-semibold">المعلمون</th>
                        <th className="px-3 py-2.5 text-center font-semibold">الدروس الظاهرة</th>
                        <th className="px-3 py-2.5 text-center font-semibold">المطلوب</th>
                        <th className="px-3 py-2.5 text-center font-semibold">اكتمال الدروس</th>
                        <th className="px-3 py-2.5 text-center font-semibold">بمخرجات</th>
                        <th className="px-3 py-2.5 text-center font-semibold">التقييمات</th>
                        <th className="px-3 py-2.5 text-center font-semibold">نسبة الحل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectData.map((s, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="px-3 py-2 font-semibold">{s.subject}</td>
                          <td className="px-3 py-2 text-center">
                            <Badge variant="secondary" className="text-xs">{s.teachers}</Badge>
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-blue-700">{toN(s.visible)}</td>
                          <td className="px-3 py-2 text-center text-slate-500">{toN(s.required)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold"
                              style={{ background: pctBg(s.completion), color: pctColor(s.completion), border: `1px solid ${pctBorder(s.completion)}` }}>
                              {s.completion}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold"
                              style={{ background: pctBg(s.outRatio), color: pctColor(s.outRatio), border: `1px solid ${pctBorder(s.outRatio)}` }}>
                              {s.outRatio}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-slate-600">{toN(s.asmCount)}</td>
                          <td className="px-3 py-2 text-center">
                            {s.solveRate > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold"
                                style={{ background: pctBg(s.solveRate), color: pctColor(s.solveRate), border: `1px solid ${pctBorder(s.solveRate)}` }}>
                                {s.solveRate}%
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!subjectData.length && <p className="p-4 text-sm text-muted-foreground">لا توجد بيانات</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── تبويب الصفوف ── */}
          <TabsContent value="grades" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* ترتيب الصفوف */}
              <Card className="shadow-none">
                <CardHeader className="border-b bg-muted/30 px-4 py-3">
                  <CardTitle className="text-sm font-bold">ترتيب الصفوف حسب اكتمال الدروس</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {gradeData.map((g, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20">
                        <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-black
                          ${i === 0 ? "bg-yellow-400 text-yellow-900" : i === 1 ? "bg-slate-400 text-white" : "bg-orange-400 text-white"}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-bold">{g.grade}</p>
                            <span className="text-xs font-bold" style={{ color: pctColor(g.completion) }}>{g.completion}%</span>
                          </div>
                          <Progress value={g.completion} className="h-1.5" />
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {toN(g.visible)} / {toN(g.required)} درس · {g.teachers} معلم
                          </p>
                        </div>
                        {pctIcon(g.completion)}
                      </div>
                    ))}
                    {!gradeData.length && <p className="p-4 text-sm text-muted-foreground">لا توجد بيانات</p>}
                  </div>
                </CardContent>
              </Card>

              {/* مخطط الصفوف */}
              <Card className="shadow-none">
                <CardHeader className="border-b bg-muted/30 px-4 py-3">
                  <CardTitle className="text-sm font-bold">نسبة الاكتمال حسب الصف</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  {gradeData.length > 0 ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={gradeData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="grade" tick={{ fontSize: 11 }} reversed={true} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} orientation="right" />
                          <Tooltip
                            contentStyle={{ direction: "rtl", fontSize: 11, borderRadius: 6 }}
                            formatter={(v, n, p) => [`${v}% (${toN(p.payload.visible)}/${toN(p.payload.required)})`, "اكتمال"]}
                          />
                          <Bar dataKey="completion" name="اكتمال الدروس" radius={[4, 4, 0, 0]}>
                            {gradeData.map((g, i) => <Cell key={i} fill={pctColor(g.completion)} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <p className="p-4 text-sm text-muted-foreground">لا توجد بيانات</p>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── تبويب الرادار ── */}
          <TabsContent value="radar">
            <Card className="shadow-none">
              <CardHeader className="border-b bg-muted/30 px-4 py-3">
                <CardTitle className="text-sm font-bold">
                  رادار الأداء — أعلى 7 مواد (النسب %)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-3">
                  كل محور = مادة / القيم = نسب مئوية (0–100%) / ثلاثة مؤشرات: اكتمال الدروس، مخرجات الدروس، نسبة حل التقييمات
                </p>
                {radarData.length > 0 ? (
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} tickFormatter={v => `${v}%`} />
                        <Radar name="اكتمال الدروس" dataKey="اكتمال الدروس" stroke="#16a34a" fill="#16a34a" fillOpacity={0.2} />
                        <Radar name="مخرجات الدروس" dataKey="مخرجات الدروس" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} />
                        <Radar name="حل التقييمات" dataKey="حل التقييمات" stroke="#ca8a04" fill="#ca8a04" fillOpacity={0.2} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ direction: "rtl", fontSize: 11, borderRadius: 6 }}
                          formatter={(v) => [`${v}%`]}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="p-4 text-sm text-muted-foreground">لا توجد بيانات</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </AppLayout>
  );
};

export default ComparisonsPage;
