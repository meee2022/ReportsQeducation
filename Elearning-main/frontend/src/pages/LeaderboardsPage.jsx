// هذه الصفحة تعرض بيانات المدرسة الحالية فقط بناءً على currentSchoolId
import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Trophy, Users, School, TrendingUp, Filter,
  Loader2, ExternalLink, Star,
} from "lucide-react";
import { AppLayout } from "@/components/layout";
import { StarRating, RankBadge, LevelBadge, EmptyState } from "@/components/common";
import { useCurrentSchool } from "@/utils/useCurrentSchool";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CSSBarChart } from "@/components/charts/CSSBarChart";
import { parseLevelNum, getBadge } from "@/utils/levelUtils";

const PAGE_SIZE = 10;
const MAROON = "#7f1d1d";
const MAROON_M = "#fca5a5";


/* ── بطاقة إحصاء صغيرة ── */
const SCard = ({ label, value, sub, icon: Icon, accent = MAROON }) => (
  <div className="rounded-xl border bg-white shadow-sm p-4 flex items-center gap-3"
    style={{ borderTop: `3px solid ${accent}` }}>
    <div className="rounded-lg p-2.5 flex-shrink-0" style={{ background: `${accent}15` }}>
      <Icon className="h-5 w-5" style={{ color: accent }} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-2xl font-extrabold leading-none" style={{ color: accent }}>
        {Number(value || 0).toLocaleString("en-US")}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
    </div>
  </div>
);

/* ── بطاقة أفضل معلم / طالب ── */
const TopCard = ({ label, name, points }) => (
  <div className="rounded-xl border bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm p-4 flex items-center gap-3"
    style={{ borderTop: "3px solid #f59e0b" }}>
    <div className="rounded-full bg-amber-100 p-2.5 flex-shrink-0">
      <Trophy className="h-5 w-5 text-amber-500" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-slate-800 truncate">{name || "—"}</p>
      {points > 0 && (
        <p className="text-xs font-semibold text-amber-600 mt-0.5">
          {Number(points).toLocaleString("en-US")} نقطة
        </p>
      )}
    </div>
  </div>
);

const getRating = (pts) => pts >= 250 ? 5 : pts >= 150 ? 4 : pts >= 100 ? 3 : pts >= 50 ? 2 : 1;

const CHART_COLORS = ["#7f1d1d", "#991b1b", "#b91c1c", "#dc2626", "#ef4444", "#f87171", "#fca5a5", "#fecaca", "#fee2e2", "#fff1f2"];

const LeaderboardsPage = () => {
  const [activeTab, setActiveTab] = useState("teachers");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [studentLevelFilter, setStudentLevelFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table");
  const [showAllTeachers, setShowAllTeachers] = useState(false);
  const [showAllStudents, setShowAllStudents] = useState(false);

  const { schoolId } = useCurrentSchool();
  const teacherLeaderboards = useQuery(api.teacherLeaderboards.list, { schoolId });
  const studentLeaderboards = useQuery(api.studentLeaderboards.list, { schoolId });

  const teachers = useMemo(() => teacherLeaderboards || [], [teacherLeaderboards]);
  const students = useMemo(() => studentLeaderboards || [], [studentLeaderboards]);

  const schools = useMemo(() => [...new Set([...teachers.map(t => t.schoolName), ...students.map(s => s.schoolName)])].filter(Boolean), [teachers, students]);
  const grades = useMemo(() => [...new Set(students.map(s => s.grade))].filter(Boolean), [students]);

  const filteredTeachers = useMemo(() =>
    teachers
      .filter(t => schoolFilter === "all" || t.schoolName === schoolFilter)
      .filter(t => levelFilter === "all" || t.level?.toString() === levelFilter)
      .sort((a, b) => parseLevelNum(b.level) - parseLevelNum(a.level) || (b.points || 0) - (a.points || 0)),
    [teachers, schoolFilter, levelFilter]);

  const filteredStudents = useMemo(() =>
    students
      .filter(s => schoolFilter === "all" || s.schoolName === schoolFilter)
      .filter(s => gradeFilter === "all" || s.grade === gradeFilter)
      .filter(s => studentLevelFilter === "all" || s.level?.toString() === studentLevelFilter)
      .sort((a, b) => parseLevelNum(b.level) - parseLevelNum(a.level) || (b.points || 0) - (a.points || 0)),
    [students, schoolFilter, gradeFilter, studentLevelFilter]);

  const visibleTeachers = showAllTeachers ? filteredTeachers : filteredTeachers.slice(0, PAGE_SIZE);
  const visibleStudents = showAllStudents ? filteredStudents : filteredStudents.slice(0, PAGE_SIZE);

  const tStats = useMemo(() => ({
    total: filteredTeachers.length,
    avg: filteredTeachers.length ? Math.round(filteredTeachers.reduce((s, t) => s + (t.points || 0), 0) / filteredTeachers.length) : 0,
    schools: new Set(filteredTeachers.map(t => t.schoolName)).size,
    top: filteredTeachers[0],
  }), [filteredTeachers]);

  const sStats = useMemo(() => ({
    total: filteredStudents.length,
    avg: filteredStudents.length ? Math.round(filteredStudents.reduce((s, st) => s + (st.points || 0), 0) / filteredStudents.length) : 0,
    schools: new Set(filteredStudents.map(s => s.schoolName)).size,
    top: filteredStudents[0],
  }), [filteredStudents]);

  const levelDist = useMemo(() => {
    const data = activeTab === "teachers" ? filteredTeachers : filteredStudents;
    const map = {};
    data.forEach(d => { const l = d.level?.toString() || "—"; map[l] = (map[l] || 0) + 1; });
    return Object.entries(map)
      .map(([l, c]) => ({ name: l, num: parseLevelNum(l), value: c }))
      .sort((a, b) => a.num - b.num);
  }, [activeTab, filteredTeachers, filteredStudents]);

  const levelNames = { "0": "مستوى صفر", "1": "الأول", "2": "الثاني", "3": "الثالث", "4": "الرابع", "5": "الخامس", "6": "السادس", "7": "السابع" };
  const uniqueLevels = useMemo(() =>
    [...new Set(teachers.map(t => t.level?.toString()).filter(v => v != null && v !== ""))]
      .sort((a, b) => parseLevelNum(a) - parseLevelNum(b)),
    [teachers]);

  const uniqueStudentLevels = useMemo(() =>
    [...new Set(students.map(s => s.level?.toString()).filter(v => v != null && v !== ""))]
      .sort((a, b) => parseLevelNum(a) - parseLevelNum(b)),
    [students]);

  if (teacherLeaderboards === undefined || studentLeaderboards === undefined) {
    return (
      <AppLayout title="لوحات الصدارة">
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: MAROON }} />
        </div>
      </AppLayout>
    );
  }

  /* ── عرض المستوى في الجدول ── */
  const renderLevel = (lvl) => {
    const n = parseLevelNum(lvl);
    const raw = lvl?.toString() || "—";
    const badge = getBadge(n);
    return (
      <div className="flex flex-col items-center gap-0.5 leading-tight">
        <span className="rounded-md px-2 py-0.5 text-xs font-extrabold"
          style={{
            background: n >= 6 ? "#fef2f2" : "#f8fafc",
            color: n >= 6 ? MAROON : "#64748b",
            border: `1px solid ${n >= 6 ? "#fca5a5" : "#e2e8f0"}`
          }}>
          {raw}
        </span>
        {badge && (
          <span className="text-[10px] font-semibold whitespace-nowrap"
            style={{ color: badge.color }}>
            {badge.emoji} {badge.label}
          </span>
        )}
      </div>
    );
  };

  /* ── فلتر مشترك ── */
  const FilterBar = ({ showLevel = false, showStudentLevel = false, showGrade = false }) => (
    <div className="rounded-xl border bg-white shadow-sm px-4 py-3"
      style={{ borderRight: `4px solid ${MAROON}` }}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4" style={{ color: MAROON }} />
          <span className="text-sm font-semibold" style={{ color: MAROON }}>تصفية</span>
        </div>
        <Select value={schoolFilter} onValueChange={setSchoolFilter}>
          <SelectTrigger className="h-8 w-44 text-sm border-slate-200 bg-white">
            <SelectValue placeholder="المدرسة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المدارس</SelectItem>
            {schools.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {showLevel && (
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="h-8 w-44 text-sm border-slate-200 bg-white">
              <SelectValue placeholder="المستوى" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المستويات</SelectItem>
              {uniqueLevels.map(l => {
                const lnames2 = { "0": "صفر", "1": "الأول", "2": "الثاني", "3": "الثالث", "4": "الرابع", "5": "الخامس", "6": "السادس", "7": "السابع" };
                return <SelectItem key={l} value={l}>{lnames2[l] ? `المستوى ${lnames2[l]}` : `مستوى ${l}`}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        )}
        {showStudentLevel && (
          <Select value={studentLevelFilter} onValueChange={setStudentLevelFilter}>
            <SelectTrigger className="h-8 w-44 text-sm border-slate-200 bg-white">
              <SelectValue placeholder="المستوى" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المستويات</SelectItem>
              {uniqueStudentLevels.map(l => {
                const lnames2 = { "0": "صفر", "1": "الأول", "2": "الثاني", "3": "الثالث", "4": "الرابع", "5": "الخامس", "6": "السادس", "7": "السابع" };
                return <SelectItem key={l} value={l}>{lnames2[l] ? `المستوى ${lnames2[l]}` : `مستوى ${l}`}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        )}
        {showGrade && (
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="h-8 w-36 text-sm border-slate-200 bg-white">
              <SelectValue placeholder="الصف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الصفوف</SelectItem>
              {grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="mr-auto flex gap-1">
          {["table", "chart"].map(m => (
            <button key={m}
              onClick={() => setViewMode(m)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
              style={viewMode === m
                ? { background: MAROON, color: "#fff" }
                : { background: "#f1f5f9", color: "#64748b" }}>
              {m === "table" ? "جدول" : "رسم بياني"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ── توزيع المستويات ── */
  const LevelDist = () => levelDist.length === 0 ? null : (
    <div className="rounded-xl border bg-white shadow-sm px-4 py-3 flex flex-wrap items-center gap-2"
      style={{ borderRight: `4px solid #6366f1` }}>
      <span className="text-sm font-semibold text-slate-600">توزيع المستويات:</span>
      {levelDist.map((item, i) => {
        const bdg = getBadge(item.num);
        return (
          <span key={i} className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border"
            style={bdg
              ? { background: bdg.bg, color: bdg.color, borderColor: bdg.border }
              : { background: "#f1f5f9", color: "#475569", borderColor: "#e2e8f0" }}>
            {bdg && bdg.emoji} {item.name}: <strong>{item.value}</strong>
          </span>
        );
      })}
    </div>
  );

  /* ── رأس الجدول ── */
  const TH = ({ children, className = "" }) => (
    <th className={`px-3 py-2.5 text-right text-xs font-bold text-white whitespace-nowrap ${className}`}
      style={{ background: MAROON }}>
      {children}
    </th>
  );
  const TD = ({ children, className = "" }) => (
    <td className={`px-3 py-2.5 text-right text-sm ${className}`}>{children}</td>
  );

  return (
    <AppLayout title="لوحات الصدارة">
      <div className="space-y-4 px-4 md:px-6" dir="rtl">

        {/* العنوان */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5" style={{ background: `${MAROON}18` }}>
            <Trophy className="h-6 w-6" style={{ color: MAROON }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">لوحات الصدارة</h1>
            <p className="text-sm text-slate-500">مرتب حسب النقاط تنازلياً</p>
          </div>
        </div>

        {/* التبويبات */}
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 w-fit shadow-sm">
          {[
            { val: "teachers", label: "صدارة المعلمين", count: teachers.length, icon: <Users className="h-4 w-4" /> },
            { val: "students", label: "صدارة الطلاب", count: students.length, icon: <Trophy className="h-4 w-4" /> },
          ].map(tab => (
            <button key={tab.val} onClick={() => setActiveTab(tab.val)}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all"
              style={activeTab === tab.val
                ? { background: MAROON, color: "#fff", boxShadow: "0 1px 4px rgba(127,29,29,0.25)" }
                : { background: "transparent", color: "#64748b" }}>
              {tab.icon}
              {tab.label}
              <span className="rounded-full px-1.5 text-xs"
                style={{
                  background: activeTab === tab.val ? "rgba(255,255,255,0.2)" : "#e2e8f0",
                  color: activeTab === tab.val ? "#fff" : "#64748b"
                }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* محتوى التبويبات */}
        <div className="space-y-4">

          {/* ── تبويب المعلمين ── */}
          {activeTab === "teachers" && (
            <div className="space-y-4">
              {/* بطاقات */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:grid-cols-4">
                <SCard label="إجمالي المعلمين" value={tStats.total} icon={Users} accent={MAROON} />
                <SCard label="المدارس" value={tStats.schools} icon={School} accent="#1d4ed8" />
                <SCard label="متوسط النقاط" value={tStats.avg} icon={TrendingUp} accent="#059669" />
                <TopCard label="أفضل معلم" name={tStats.top?.teacherName} points={tStats.top?.points || 0} />
              </div>

              <LevelDist />
              <FilterBar showLevel />

              {/* الجدول أو الرسم */}
              {viewMode === "table" ? (
                <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed border-collapse text-sm" dir="rtl">
                      <colgroup>
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "28%" }} />
                        <col style={{ width: "22%" }} />
                        <col style={{ width: "15%" }} />
                        <col style={{ width: "13%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "7%" }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <TH className="text-center">#</TH>
                          <TH>اسم المعلم</TH>
                          <TH>المدرسة</TH>
                          <TH className="text-center">المستوى</TH>
                          <TH className="text-center">النقاط</TH>
                          <TH className="text-center">التقييم</TH>
                          <TH className="text-center">الصفحة</TH>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleTeachers.length > 0 ? visibleTeachers.map((t, i) => (
                          <tr key={t._id || i}
                            className="border-b border-slate-100 transition-colors"
                            style={{ background: i === 0 ? "#fffbeb" : i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                            <TD><RankBadge rank={i + 1} /></TD>
                            <TD className="font-semibold text-slate-800">{t.teacherName}</TD>
                            <TD className="text-slate-500 text-xs max-w-[9rem] truncate" title={t.schoolName}>{t.schoolName}</TD>
                            <TD className="text-center">{renderLevel(t.level)}</TD>
                            <TD>
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
                                style={{ background: "#dcfce7", color: "#166534", border: "1px solid #86efac" }}>
                                {Number(t.points || 0).toLocaleString("en-US")} نقطة
                              </span>
                            </TD>
                            <TD><StarRating rating={getRating(t.points || 0)} /></TD>
                            <TD>
                              {t.teacherUrl
                                ? <a href={t.teacherUrl} target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-semibold rounded-lg px-2.5 py-1 border transition-colors hover:bg-slate-50"
                                  style={{ borderColor: MAROON_M, color: MAROON }}>
                                  <ExternalLink className="h-3 w-3" /> عرض الصفحة
                                </a>
                                : <span className="text-xs text-slate-300">—</span>}
                            </TD>
                          </tr>
                        )) : (
                          <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">لا توجد بيانات معلمين</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {filteredTeachers.length > PAGE_SIZE && (
                    <div className="border-t border-slate-100 px-4 py-2 text-center">
                      <button onClick={() => setShowAllTeachers(v => !v)}
                        className="text-sm font-semibold transition-colors"
                        style={{ color: MAROON }}>
                        {showAllTeachers ? "عرض أقل ▲" : `عرض المزيد (${filteredTeachers.length - PAGE_SIZE} إضافي) ▼`}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border bg-white shadow-sm p-4">
                  <p className="text-sm font-bold text-slate-700 mb-3">توزيع النقاط — أعلى 10 معلمين</p>
                  {filteredTeachers.length > 0 ? (
                    <CSSBarChart
                      data={filteredTeachers.slice(0, 10).map((t, i) => ({
                        label: t.teacherName,
                        value: Number(t.points || 0),
                        color: CHART_COLORS[i % CHART_COLORS.length],
                      }))}
                      unit=" نقطة"
                      maxRows={10}
                    />
                  ) : <EmptyState title="لا توجد بيانات" />}
                </div>
              )}
            </div>
          )}

          {/* ── تبويب الطلاب ── */}
          {activeTab === "students" && (
            <div className="space-y-4">
              {/* بطاقات */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:grid-cols-4">
                <SCard label="إجمالي الطلاب" value={sStats.total} icon={Trophy} accent={MAROON} />
                <SCard label="المدارس" value={sStats.schools} icon={School} accent="#1d4ed8" />
                <SCard label="متوسط النقاط" value={sStats.avg} icon={TrendingUp} accent="#059669" />
                <TopCard label="أفضل طالب"
                  name={sStats.top ? (sStats.top.studentName || `${sStats.top.firstName ?? ""} ${sStats.top.lastName ?? ""}`.trim()) : null}
                  points={sStats.top?.points || 0} />
              </div>

              <LevelDist />
              <FilterBar showStudentLevel showGrade />

              {/* جدول الطلاب */}
              <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed border-collapse text-sm" dir="rtl">
                    <colgroup>
                      <col style={{ width: "5%" }} />
                      <col style={{ width: "25%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "7%" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <TH className="text-center">#</TH>
                        <TH>اسم الطالب</TH>
                        <TH className="text-center">كود الطالب</TH>
                        <TH className="text-center">الصف</TH>
                        <TH className="text-center">النقاط</TH>
                        <TH className="text-center">المستوى</TH>
                        <TH>المدرسة</TH>
                        <TH className="text-center">الصفحة</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleStudents.length > 0 ? visibleStudents.map((s, i) => (
                        <tr key={s._id || i}
                          className="border-b border-slate-100 transition-colors"
                          style={{ background: i === 0 ? "#fffbeb" : i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                          <TD><RankBadge rank={i + 1} /></TD>
                          <TD className="font-semibold text-slate-800">
                            {s.studentName || `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim()}
                          </TD>
                          <TD className="text-center text-slate-500 text-xs">{s.studentCode}</TD>
                          <TD className="text-center text-slate-600 text-xs">{s.grade}</TD>
                          <TD className="text-center">
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
                              style={{ background: "#dcfce7", color: "#166534", border: "1px solid #86efac" }}>
                              {Number(s.points || 0).toLocaleString("en-US")} نقطة
                            </span>
                          </TD>
                          <TD className="text-center">{renderLevel(s.level)}</TD>
                          <TD className="text-slate-500 text-xs max-w-[9rem] truncate" title={s.schoolName}>{s.schoolName}</TD>
                          <TD>
                            {s.studentUrl
                              ? <a href={s.studentUrl} target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold rounded-lg px-2.5 py-1 border transition-colors hover:bg-slate-50"
                                style={{ borderColor: MAROON_M, color: MAROON }}>
                                <ExternalLink className="h-3 w-3" /> عرض الصفحة
                              </a>
                              : <span className="text-xs text-slate-300">—</span>}
                          </TD>
                        </tr>
                      )) : (
                        <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-400">لا توجد بيانات طلاب</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredStudents.length > PAGE_SIZE && (
                  <div className="border-t border-slate-100 px-4 py-2 text-center">
                    <button onClick={() => setShowAllStudents(v => !v)}
                      className="text-sm font-semibold transition-colors"
                      style={{ color: MAROON }}>
                      {showAllStudents ? "عرض أقل ▲" : `عرض المزيد (${filteredStudents.length - PAGE_SIZE} إضافي) ▼`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default LeaderboardsPage;
