// هذه الصفحة تعرض بيانات المدرسة الحالية فقط بناءً على currentSchoolId
import React, { useState, useMemo, useRef, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePersistentDateFilter } from "@/utils/usePersistentDateFilter";
import { useCurrentSchool } from "@/utils/useCurrentSchool";
import { CSSBarChart } from "@/components/charts/CSSBarChart";
import {
  Loader2, Printer, Users, FileText, Search, Mail, LayoutGrid, Download
} from "lucide-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import JSZip from "jszip";

/* ─── مساعدات ─── */
const toAr = (n) => Number(n || 0).toLocaleString("en-US");
const pct = (v) => `${Number(v || 0).toFixed(2)}%`;
const today = () => new Date().toLocaleDateString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" });

const ONE_WEEK_MS = 7 * 24 * 3600 * 1000;

const getWeeksBetween = (start, end) => {
  if (!start || !end) return 0;
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / ONE_WEEK_MS));
};

const normalizeArabic = (s) =>
  String(s ?? "").trim()
    .replace(/أ|إ|آ/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ئ/g, "ي");

/* لون حسب النسبة */
const pctColor = (v) => {
  if (v >= 90) return "#16a34a";
  if (v >= 70) return "#ca8a04";
  return "#dc2626";
};

const dot = (v) => {
  if (v >= 90) return "🟢";
  if (v >= 70) return "🟡";
  return "🔴";
};

/* شارة الحالة مع علامة ✓ / ✗ بدلاً من الدوائر */
const StatusBadge = ({ pct, label }) => {
  const color = pct >= 90 ? "#16a34a" : pct >= 70 ? "#ca8a04" : "#dc2626";
  const bg = pct >= 90 ? "#f0fdf4" : pct >= 70 ? "#fefce8" : "#fef2f2";
  const mark = pct >= 90 ? "✓" : pct >= 70 ? "⚠" : "✗";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "3px",
      background: bg, color, fontWeight: 700, fontSize: "11px",
      padding: "2px 5px", borderRadius: "4px", border: `1px solid ${color}`,
      WebkitPrintColorAdjust: "exact", printColorAdjust: "exact",
    }}>
      <span style={{ fontSize: "12px" }}>{mark}</span> {label}
    </span>
  );
};

/* ─── صفحة التقارير ─── */
const ReportsPage = () => {
  const { schoolId } = useCurrentSchool();

  /* ─ بيانات ─ */
  const lessonsAgg = useQuery(api.lessonsAgg.list, { schoolId });
  const assessmentsAgg = useQuery(api.assessmentsAgg.list, { schoolId });
  const termsData = useQuery(api.terms.getActive, { schoolId });
  const subjectsQuota = useQuery(api.subjectsQuota.list, { schoolId });
  const classTracks = useQuery(api.classTracks.list, { schoolId });
  const schoolBreaksList = useQuery(api.schoolBreaks.list, { schoolId });
  const breaks = useMemo(() => schoolBreaksList || [], [schoolBreaksList]);

  /* ─ فلاتر ─ */
  const [activeTab, setActiveTab] = useState("teacher");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [cameFromDept, setCameFromDept] = useState(false);
  const [filterSubject, setFilterSubject] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const { fromDate, setFromDate, toDate, setToDate, resetDates } = usePersistentDateFilter("reports");

  const printRef = useRef(null);
  const termSettings = useMemo(() => {
    const t = termsData;
    if (!t) return { start: "", end: "", effectiveWeeks: 0, regularWeeks: 0, ramadanWeeks: 0, filterStart: "", filterEnd: "", schoolName: "", principalName: "", viceNames: "", coordinatorName: "" };
    const termStart = t.startDate || "";
    const termEnd = t.endDate || "";
    const start = fromDate || termStart;
    const end = toDate || termEnd;
    const totalWeeks = getWeeksBetween(start, end) || t.weekCount || 0;
    const periodStart = start ? new Date(start) : null;
    const periodEnd = end ? new Date(end) : new Date();

    // حساب أسابيع الإجازات
    let holidayDays = 0;
    if (periodStart && periodEnd) {
      for (const b of breaks) {
        const bs = new Date(b.startDate);
        const be = new Date(b.endDate);
        const os = bs > periodStart ? bs : periodStart;
        const oe = be < periodEnd ? be : periodEnd;
        if (oe >= os) {
          holidayDays += Math.max(0, Math.round((oe - os) / (1000 * 60 * 60 * 24)) + 1);
        }
      }
    }
    const holidayWeeks = holidayDays / 7;

    // حساب أسابيع رمضان
    let ramadanWeeks = 0;
    if (t.ramadanStart && t.ramadanEnd && periodStart && periodEnd) {
      const rs = new Date(t.ramadanStart);
      const re = new Date(t.ramadanEnd);
      const os = rs > periodStart ? rs : periodStart;
      const oe = re < periodEnd ? re : periodEnd;
      if (oe >= os) {
        ramadanWeeks = Math.max(1, Math.ceil((oe - os) / (1000 * 60 * 60 * 24 * 7)));
      }
    }

    const regularWeeks = Math.max(0, totalWeeks - Math.ceil(holidayWeeks) - ramadanWeeks);

    return {
      start: termStart, end: termEnd,
      effectiveWeeks: totalWeeks,
      regularWeeks,
      ramadanWeeks,
      ramadanStart: t.ramadanStart,
      ramadanEnd: t.ramadanEnd,
      filterStart: start, filterEnd: end,
      schoolName: t.schoolName || "",
      principalName: t.principalName || "",
      viceNames: t.viceNames || "",
      coordinatorName: t.coordinatorName || "",
    };
  }, [termsData, fromDate, toDate, breaks]);

  /* ─ بناء index للـ track حسب الصف/الشعبة ─ */
  const trackIndex = useMemo(() => {
    const m = new Map();
    for (const r of (classTracks || [])) {
      const grade = String(r.grade || "").trim();
      const className = String(r.className || "").trim();
      // مفتاح كامل: "12::12-5"
      m.set(grade + "::" + className, r.track);
      // مفتاح مختصر: "12::5" (الجزء بعد آخر شرطة - يتطابق مع section في lessonsAgg)
      const dashIdx = className.lastIndexOf("-");
      if (dashIdx !== -1) {
        const section = className.substring(dashIdx + 1);
        const shortKey = grade + "::" + section;
        if (!m.has(shortKey)) m.set(shortKey, r.track);
      }
    }
    return m;
  }, [classTracks]);

  /* ─ دالة النصاب الأسبوعي (تُرجع weeklyQuota و ramadanQuota) ─ */
  const getWeeklyQuota = useMemo(() => {
    const quotaRows = subjectsQuota || [];
    return (grade, subjectName, track) => {
      const g = normalizeArabic(grade);
      const s = normalizeArabic(subjectName);
      const tr = normalizeArabic(track);
      if (!g || !s) return { weeklyQuota: 0, ramadanQuota: null };
      let hit = quotaRows.find(q =>
        normalizeArabic(q.grade) === g &&
        normalizeArabic(q.subjectName) === s &&
        normalizeArabic(q.track) === tr
      );
      if (hit) return { weeklyQuota: Number(hit.weeklyQuota || 0), ramadanQuota: hit.ramadanQuota != null ? Number(hit.ramadanQuota) : null };
      hit = quotaRows.find(q =>
        normalizeArabic(q.grade) === g &&
        normalizeArabic(q.subjectName) === s
      );
      if (hit) return { weeklyQuota: Number(hit.weeklyQuota || 0), ramadanQuota: hit.ramadanQuota != null ? Number(hit.ramadanQuota) : null };
      hit = quotaRows.find(q => normalizeArabic(q.subjectName) === s);
      if (hit) return { weeklyQuota: Number(hit.weeklyQuota || 0), ramadanQuota: hit.ramadanQuota != null ? Number(hit.ramadanQuota) : null };
      return { weeklyQuota: 0, ramadanQuota: null };
    };
  }, [subjectsQuota]);

  /* ─ دالة حساب الدروس المطلوبة مع رمضان والإجازات ─ */
  const calcRequired = useCallback((weeklyQuota, ramadanQuota) => {
    if (!weeklyQuota) return 0;
    const rw = termSettings.regularWeeks || 0;
    const rmw = termSettings.ramadanWeeks || 0;
    const rq = ramadanQuota != null ? ramadanQuota : weeklyQuota;
    return (rw * weeklyQuota) + (rmw * rq);
  }, [termSettings]);

  /* ─ بناء بيانات المعلمين (نفس منطق TeachersPerformancePage) ─ */
  const teachersData = useMemo(() => {
    if (!lessonsAgg) return [];
    const map = {};
    lessonsAgg.forEach((l) => {
      const key = `${l.teacherName}|${l.schoolName}`;
      if (!map[key]) {
        map[key] = {
          teacherName: l.teacherName,
          schoolName: l.schoolName,
          classes: [],
          totalLessons: 0,
          visibleLessons: 0,
          lessonsWithOutcomes: 0,
          lessonsWithNotes: 0,
          lessonsWithSections: 0,
        };
      }
      const t = map[key];
      t.classes.push(l);
      t.totalLessons += l.totalLessons || 0;
      t.visibleLessons += l.visibleLessons || 0;
      t.lessonsWithOutcomes += l.lessonsWithOutcomes || 0;
      t.lessonsWithNotes += l.lessonsWithNotes || 0;
      t.lessonsWithSections += l.lessonsWithSections || 0;
    });
    return Object.values(map).sort((a, b) => a.teacherName.localeCompare(b.teacherName, "ar"));
  }, [lessonsAgg]);

  /* ─ بيانات تقييمات المعلم ─ */
  const teacherAssessments = useMemo(() => {
    if (!assessmentsAgg || !selectedTeacher) return [];
    return assessmentsAgg.filter(a => a.teacherName === selectedTeacher);
  }, [assessmentsAgg, selectedTeacher]);

  /* ─ بيانات الدروس لمعلم مختار ─ */
  const teacherLessons = useMemo(() => {
    if (!lessonsAgg || !selectedTeacher) return [];
    return lessonsAgg.filter(l => l.teacherName === selectedTeacher);
  }, [lessonsAgg, selectedTeacher]);

  /* ─ إحصائيات المعلم ─ */
  const teacherStats = useMemo(() => {
    const rows = teacherLessons.map((l) => {
      /* النصاب من جدول subjectsQuota */
      const trackKey = String(l.grade || "").trim() + "::" + String(l.section || "").trim();
      const track = trackIndex.get(trackKey) || "";
      const quota = getWeeklyQuota(l.grade, l.subjectName, track);
      const weeklyQuota = quota.weeklyQuota;
      const required = calcRequired(weeklyQuota, quota.ramadanQuota);
      const visible = l.visibleLessons || 0;
      const total = l.totalLessons || 0;
      const completion = required > 0 ? Math.min(100, (visible / required) * 100) : 0;
      const outcomes = total > 0 ? (l.lessonsWithOutcomes / total) * 100 : 0;

      /* تقييمات هذه الشعبة */
      const asmRow = teacherAssessments.find(
        a => a.subjectCode === l.subjectCode || (a.grade === l.grade && a.section === l.section && a.subjectName?.trim() === l.subjectName?.trim())
      );

      return {
        subjectCode: l.subjectCode,
        subjectName: l.subjectName,
        grade: l.grade,
        section: l.section,
        schoolName: l.schoolName,
        weeklyQuota,
        required,
        visible,
        total,
        lessonsWithNotes: l.lessonsWithNotes || 0,
        lessonsWithSections: l.lessonsWithSections || 0,
        lessonsWithOutcomes: l.lessonsWithOutcomes || 0,
        completion,
        outcomes,
        isInTimetable: l.isInTimetable,
        currentLessonDate: l.currentLessonDate,
        subjectUrl: l.subjectUrl,
        /* تقييمات */
        assessmentsCount: asmRow?.assessmentsCount || 0,
        submissionsCount: asmRow?.submissionsCount || 0,
        solvePercentage: asmRow?.solvePercentage || 0,
        correctionPct: asmRow?.correctionCompletionPercentage || 0,
        assessmentsWithOutcomes: asmRow?.assessmentsWithOutcomes || 0,
        assessmentsUrl: asmRow?.assessmentsUrl,
      };
    });

    /* إجماليات */
    const totVisible = rows.reduce((s, r) => s + r.visible, 0);
    const totRequired = rows.reduce((s, r) => s + r.required, 0);
    const totAsmCount = rows.reduce((s, r) => s + r.assessmentsCount, 0);
    const totSubs = rows.reduce((s, r) => s + r.submissionsCount, 0);
    const totOutcLess = rows.reduce((s, r) => s + r.lessonsWithOutcomes, 0);
    const totLessons = rows.reduce((s, r) => s + r.total, 0);
    const totAsmOut = rows.reduce((s, r) => s + r.assessmentsWithOutcomes, 0);

    const lessonsCompletionRate = totRequired > 0 ? Math.min(100, (totVisible / totRequired) * 100) : 0;
    const outcomesRate = totLessons > 0 ? Math.min(100, (totOutcLess / totLessons) * 100) : 0;
    const asmOutcomesRate = totAsmCount > 0 ? Math.min(100, (totAsmOut / totAsmCount) * 100) : 0;
    const solveRate = rows.length > 0
      ? rows.reduce((s, r) => s + r.solvePercentage, 0) / rows.length : 0;
    const correctionRate = rows.filter(r => r.submissionsCount > 0).length > 0
      ? rows.filter(r => r.submissionsCount > 0)
        .reduce((s, r) => s + r.correctionPct, 0) / rows.filter(r => r.submissionsCount > 0).length
      : 0;

    return {
      rows,
      totVisible, totRequired,
      totAsmCount, totSubs,
      lessonsCompletionRate,
      outcomesRate,
      asmOutcomesRate,
      solveRate,
      correctionRate,
    };
  }, [teacherLessons, teacherAssessments, termSettings, trackIndex, getWeeklyQuota, calcRequired]);

  /* ─ بيانات الأقسام (مجمّعة حسب اسم المادة) ─ */
  const departments = useMemo(() => {
    const set = new Set(lessonsAgg?.map(l => (l.subjectName || "").trim()).filter(Boolean) || []);
    return [...set].sort((a, b) => a.localeCompare(b, "ar"));
  }, [lessonsAgg]);

  const deptStats = useMemo(() => {
    if (!lessonsAgg || !selectedDept) return { teachers: [], totals: null, subjectName: "" };
    const deptLessons = lessonsAgg.filter(l => (l.subjectName || "").trim() === selectedDept);
    const map = {};
    deptLessons.forEach(l => {
      const key = l.teacherName;
      if (!map[key]) {
        map[key] = {
          teacherName: l.teacherName,
          schoolName: l.schoolName,
          classes: 0,
          visible: 0, required: 0, total: 0,
          outcomes: 0, notes: 0,
          sections: [],
        };
      }
      const t = map[key];
      t.classes++;
      t.sections.push(`${l.grade || ""}/${l.section || ""}`);
      t.visible += l.visibleLessons || 0;
      t.total += l.totalLessons || 0;
      t.outcomes += l.lessonsWithOutcomes || 0;
      t.notes += l.lessonsWithNotes || 0;
      const wqData = getWeeklyQuota(l.grade, l.subjectName, trackIndex.get(String(l.grade || "").trim() + "::" + String(l.section || "").trim()) || "");
      t.required += calcRequired(wqData.weeklyQuota, wqData.ramadanQuota);
    });
    const teachers = Object.values(map).map(t => ({
      ...t,
      sectionsLabel: t.sections.join("، "),
      completion: t.required > 0 ? Math.min(100, (t.visible / t.required) * 100) : 0,
      outcomesRatio: t.total > 0 ? Math.min(100, (t.outcomes / t.total) * 100) : 0,
    })).sort((a, b) => b.completion - a.completion);

    const totals = {
      teachers: teachers.length,
      visible: teachers.reduce((s, t) => s + t.visible, 0),
      required: teachers.reduce((s, t) => s + t.required, 0),
      outcomes: teachers.reduce((s, t) => s + t.outcomes, 0),
      total: teachers.reduce((s, t) => s + t.total, 0),
    };
    totals.completion = totals.required > 0 ? Math.min(100, (totals.visible / totals.required) * 100) : 0;
    totals.outcomesRatio = totals.total > 0 ? Math.min(100, (totals.outcomes / totals.total) * 100) : 0;
    return { teachers, totals, subjectName: selectedDept };
  }, [lessonsAgg, selectedDept, termSettings, trackIndex, getWeeklyQuota, calcRequired]);

  /* ─ ملخص كل الأقسام (للنظرة الشاملة) ─ */
  const allDeptStats = useMemo(() => {
    if (!lessonsAgg) return [];
    const map = {};
    lessonsAgg.forEach(l => {
      const subj = (l.subjectName || "").trim();
      if (!subj) return;
      if (!map[subj]) map[subj] = { subjectName: subj, visible: 0, total: 0, required: 0, outcomes: 0, notes: 0, teachers: new Set() };
      const m = map[subj];
      m.visible += l.visibleLessons || 0;
      m.total += l.totalLessons || 0;
      m.outcomes += l.lessonsWithOutcomes || 0;
      m.notes += l.lessonsWithNotes || 0;
      m.teachers.add(l.teacherName);
      const wqData = getWeeklyQuota(l.grade, l.subjectName, trackIndex.get(String(l.grade || "").trim() + "::" + String(l.section || "").trim()) || "");
      m.required += calcRequired(wqData.weeklyQuota, wqData.ramadanQuota);
    });
    return Object.values(map).map(m => {
      /* مطابقة التقييمات للمادة */
      const asmRows = assessmentsAgg?.filter(a => (a.subjectName || "").trim() === m.subjectName) || [];
      const asmCount = asmRows.reduce((s, a) => s + (a.assessmentsCount || 0), 0);
      const subCount = asmRows.reduce((s, a) => s + (a.submissionsCount || 0), 0);
      const studTotal = asmRows.reduce((s, a) => s + (Number(a.totalStudents) || 0) * (a.assessmentsCount || 0), 0);
      const solveRate = studTotal > 0 ? (subCount / studTotal) * 100 : 0;
      const corrected = asmRows.reduce((s, a) => s + (a.correctedCount || 0), 0);
      const corrRate = subCount > 0 ? (corrected / subCount) * 100 : 0;
      return {
        ...m,
        teacherCount: m.teachers.size,
        completion: m.required > 0 ? Math.min(100, (m.visible / m.required) * 100) : 0,
        outcomesRatio: m.total > 0 ? Math.min(100, (m.outcomes / m.total) * 100) : 0,
        asmCount,
        solveRate,
        corrRate,
      };
    }).sort((a, b) => a.subjectName.localeCompare(b.subjectName, "ar"));
  }, [lessonsAgg, assessmentsAgg, termSettings, trackIndex, getWeeklyQuota, calcRequired]);

  /* ─ ملخص كل الصفوف (للنظرة الشاملة) ─ */
  const allGradeStats = useMemo(() => {
    if (!lessonsAgg) return [];
    const map = {};
    lessonsAgg.forEach(l => {
      const key = `${l.grade || ""}/${l.section || ""}`;
      if (!map[key]) map[key] = { grade: l.grade, section: l.section, key, visible: 0, total: 0, required: 0, outcomes: 0 };
      const m = map[key];
      m.visible += l.visibleLessons || 0;
      m.total += l.totalLessons || 0;
      m.outcomes += l.lessonsWithOutcomes || 0;
      const wqData = getWeeklyQuota(l.grade, l.subjectName, trackIndex.get(String(l.grade || "").trim() + "::" + String(l.section || "").trim()) || "");
      m.required += calcRequired(wqData.weeklyQuota, wqData.ramadanQuota);
    });
    return Object.values(map).map(m => {
      const asmRows = assessmentsAgg?.filter(a => String(a.grade || "") === String(m.grade || "") && String(a.section || "") === String(m.section || "")) || [];
      const subCount = asmRows.reduce((s, a) => s + (a.submissionsCount || 0), 0);
      const studTotal = asmRows.reduce((s, a) => s + (Number(a.totalStudents) || 0) * (a.assessmentsCount || 0), 0);
      return {
        ...m,
        completion: m.required > 0 ? (m.visible / m.required) * 100 : 0,
        solveRate: studTotal > 0 ? (subCount / studTotal) * 100 : 0,
      };
    }).sort((a, b) => {
      const ga = Number(a.grade) || 0, gb = Number(b.grade) || 0;
      if (ga !== gb) return ga - gb;
      return String(a.section || "").localeCompare(String(b.section || ""), "ar");
    });
  }, [lessonsAgg, assessmentsAgg, termSettings, trackIndex, getWeeklyQuota, calcRequired]);

  /* ─ طباعة ─ */
  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const schoolNameStr = termSettings.schoolName || "";
    const printDate = new Date().toLocaleDateString("ar-EG");
    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html><html dir="rtl" lang="ar-u-nu-latn">
      <head>
        <meta charset="UTF-8"/>
        <title>تقرير أداء${schoolNameStr ? " - " + schoolNameStr : ""}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          @page { size: A4 landscape; margin: 10mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Cairo', sans-serif; font-size: 10px; direction: rtl; color: #111; padding: 5px; }
          .print-header { background: #7f1d1d !important; color: white !important; padding: 12px; border-radius: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed; page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          th { background: #7f1d1d !important; color: white !important; padding: 6px 4px; border: 1px solid #991b1b; font-size: 10px; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          td { padding: 5px 4px; border: 1px solid #e2e8f0; text-align: center; font-size: 10px; word-break: break-word; }
          tr:nth-child(even) td { background: #fdf2f2 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-hide { display: none !important; }
          [style*="background"] { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @media print {
            body { padding: 0; }
            .print-header { margin-top: 0; }
            button, .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <div>
            <div style="font-size:16px;font-weight:800">${schoolNameStr || "تقرير أداء"}</div>
            <div style="font-size:10px;opacity:0.9;margin-top:2px">تاريخ الطباعة: ${printDate}</div>
          </div>
          <div style="text-align:left; font-size:11px">نظام قطر للتعليم</div>
        </div>
        ${content}
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  /* ── طباعة موسعة لتقرير القسم: الملخص + تفاصيل كل معلم ── */
  const handlePrintDeptExpanded = () => {
    if (!selectedDept || !deptStats?.teachers?.length) return;

    // إجبار الأرقام على الإنجليزية عبر bdi + lang="en"
    const n = (v) => `<bdi lang="en" style="font-family:Arial,sans-serif">${Number(v || 0).toLocaleString("en-US")}</bdi>`;
    const pct = (v) => {
      const val = Math.min(100, Number(v || 0));
      const color = val >= 80 ? "#16a34a" : val >= 50 ? "#ca8a04" : "#dc2626";
      const icon = val >= 80 ? "✓" : val >= 50 ? "!" : "✗";
      return `<span style="color:${color};font-weight:700">${icon} <bdi lang="en" style="font-family:Arial,sans-serif">${val.toFixed(1)}%</bdi></span>`;
    };
    const t = deptStats.totals;
    const schoolNameStr = termSettings.schoolName || deptStats.teachers[0]?.schoolName || "";
    const printDate = new Date().toLocaleDateString("en-US");

    const teacherRows = deptStats.teachers.map((tc, i) => {
      const compColor = tc.completion >= 80 ? "#dcfce7" : tc.completion >= 50 ? "#fef9c3" : "#fee2e2";
      return `
      <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"}">
        <td style="font-weight:600;color:#374151">${i + 1}</td>
        <td style="text-align:right;font-weight:700;font-size:10px">${tc.teacherName}</td>
        <td style="font-size:8px;color:#64748b;line-height:1.5">${tc.sections.map(s => `<span style="display:inline-block;background:#f1f5f9;border-radius:3px;padding:1px 4px;margin:1px">${s}</span>`).join("")}</td>
        <td>${n(tc.classes)}</td>
        <td>${tc.required > 0 ? n(tc.required) : "—"}</td>
        <td style="font-weight:700;color:#1d4ed8">${n(tc.visible)}</td>
        <td style="color:#ea580c">${n(tc.total - tc.visible)}</td>
        <td>${n(tc.outcomes)}</td>
        <td>${n(tc.notes)}</td>
        <td style="background:${compColor};font-weight:700">${pct(tc.completion)}</td>
        <td>${pct(tc.outcomesRatio)}</td>
      </tr>`;
    }).join("");

    const summaryCards = `
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:10px">
        <div style="background:#eff6ff;border:1.5px solid #93c5fd;border-radius:6px;padding:6px;text-align:center">
          <div style="font-size:9px;color:#64748b;margin-bottom:2px">عدد المعلمين</div>
          <div style="font-size:18px;font-weight:800;color:#1d4ed8">${n(t.teachers)}</div>
        </div>
        <div style="background:#f0fdf4;border:1.5px solid ${t.completion >= 80 ? "#86efac" : "#fca5a5"};border-radius:6px;padding:6px;text-align:center">
          <div style="font-size:9px;color:#64748b;margin-bottom:2px">اكتمال الدروس</div>
          <div style="font-size:18px;font-weight:800;color:${t.completion >= 80 ? "#16a34a" : "#dc2626"}"><bdi lang="en" style="font-family:Arial,sans-serif">${Math.min(100, t.completion).toFixed(1)}%</bdi></div>
        </div>
        <div style="background:#f0fdf4;border:1.5px solid ${t.outcomesRatio >= 80 ? "#86efac" : "#fca5a5"};border-radius:6px;padding:6px;text-align:center">
          <div style="font-size:9px;color:#64748b;margin-bottom:2px">الدروس بالمخرجات</div>
          <div style="font-size:18px;font-weight:800;color:${t.outcomesRatio >= 80 ? "#16a34a" : "#dc2626"}"><bdi lang="en" style="font-family:Arial,sans-serif">${Math.min(100, t.outcomesRatio).toFixed(1)}%</bdi></div>
        </div>
        <div style="background:#eff6ff;border:1.5px solid #93c5fd;border-radius:6px;padding:6px;text-align:center">
          <div style="font-size:9px;color:#64748b;margin-bottom:2px">الدروس الظاهرة</div>
          <div style="font-size:18px;font-weight:800;color:#1d4ed8">${n(t.visible)}</div>
        </div>
        <div style="background:#eff6ff;border:1.5px solid #93c5fd;border-radius:6px;padding:6px;text-align:center">
          <div style="font-size:9px;color:#64748b;margin-bottom:2px">الدروس المطلوبة</div>
          <div style="font-size:18px;font-weight:800;color:#374151">${n(t.required)}</div>
        </div>
      </div>`;

    const teacherDetails = deptStats.teachers.map((tc) => {
      const teacherLessons = (lessonsAgg || []).filter(l => l.teacherName === tc.teacherName);
      const teacherAssess = (assessmentsAgg || []).filter(a => a.teacherName === tc.teacherName);

      const lessonRows = teacherLessons.map((l, i) => {
        const compVal = l.requiredLessons > 0 ? Math.min(100, (l.visibleLessons / l.requiredLessons) * 100) : 0;
        const rowBg = i % 2 === 0 ? "#ffffff" : "#f0fdf4";
        return `
        <tr style="background:${rowBg}">
          <td style="text-align:right;font-weight:600">${l.subjectName}</td>
          <td>${l.grade}</td>
          <td>${l.section}</td>
          <td style="font-weight:700">${n(l.totalLessons)}</td>
          <td style="color:#16a34a;font-weight:700">${n(l.visibleLessons)}</td>
          <td style="color:#dc2626">${n(l.hiddenLessons)}</td>
          <td>${n(l.lessonsWithOutcomes)}</td>
          <td>${n(l.lessonsWithNotes)}</td>
        </tr>`;
      }).join("") || `<tr><td colspan="8" style="color:#9ca3af;text-align:center;padding:6px">لا توجد بيانات دروس</td></tr>`;

      const assessRows = teacherAssess.map((a, i) => {
        const rowBg = i % 2 === 0 ? "#ffffff" : "#fefce8";
        return `
        <tr style="background:${rowBg}">
          <td style="text-align:right;font-weight:600">${a.subjectName}</td>
          <td>${a.grade}</td>
          <td>${a.section}</td>
          <td style="font-weight:700">${n(a.assessmentsCount)}</td>
          <td>${n(a.assignedAssessments)}</td>
          <td>${n(a.submissionsCount)}</td>
          <td>${pct(Math.min(100, a.solvePercentage))}</td>
          <td>${pct(Math.min(100, a.correctionCompletionPercentage))}</td>
        </tr>`;
      }).join("") || `<tr><td colspan="8" style="color:#9ca3af;text-align:center;padding:6px">لا توجد بيانات تقييمات</td></tr>`;

      const compColor = tc.completion >= 80 ? "#16a34a" : tc.completion >= 50 ? "#ca8a04" : "#dc2626";
      return `
        <div class="teacher-block">
          <!-- رأس المعلم -->
          <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:white;padding:7px 12px;border-radius:7px;margin-bottom:7px;display:flex;justify-content:space-between;align-items:center;-webkit-print-color-adjust:exact;print-color-adjust:exact">
            <div>
              <div style="font-size:13px;font-weight:800">${tc.teacherName}</div>
              <div style="font-size:8px;opacity:0.85;margin-top:2px">القسم: ${selectedDept} | المدرسة: ${tc.schoolName}</div>
            </div>
            <div style="text-align:center;background:rgba(255,255,255,0.15);border-radius:5px;padding:3px 8px">
              <div style="font-size:8px;opacity:0.8">اكتمال الدروس</div>
              <div style="font-size:18px;font-weight:900;color:${tc.completion >= 80 ? "#86efac" : "#fca5a5"}"><bdi lang="en" style="font-family:Arial,sans-serif">${Math.min(100, tc.completion).toFixed(1)}%</bdi></div>
            </div>
          </div>

          <!-- بطاقات سريعة -->
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:8px">
            <div style="background:#eff6ff;border-radius:5px;padding:5px;text-align:center;border:1px solid #bfdbfe">
              <div style="font-size:8px;color:#64748b">الشعب</div>
              <div style="font-size:15px;font-weight:800;color:#1d4ed8">${n(tc.classes)}</div>
            </div>
            <div style="background:#f0fdf4;border-radius:5px;padding:5px;text-align:center;border:1px solid #bbf7d0">
              <div style="font-size:8px;color:#64748b">الدروس الظاهرة</div>
              <div style="font-size:15px;font-weight:800;color:#16a34a">${n(tc.visible)}</div>
            </div>
            <div style="background:#fff7ed;border-radius:5px;padding:5px;text-align:center;border:1px solid #fed7aa">
              <div style="font-size:8px;color:#64748b">المطلوبة</div>
              <div style="font-size:15px;font-weight:800;color:#ea580c">${tc.required > 0 ? n(tc.required) : "—"}</div>
            </div>
            <div style="background:#f0fdf4;border-radius:5px;padding:5px;text-align:center;border:1px solid #bbf7d0">
              <div style="font-size:8px;color:#64748b">بمخرجات</div>
              <div style="font-size:15px;font-weight:800;color:#15803d">${n(tc.outcomes)}</div>
            </div>
          </div>

          <!-- جدول الدروس -->
          <div style="font-weight:700;font-size:10px;color:#166534;background:#dcfce7;padding:4px 8px;border-radius:4px;margin-bottom:4px">جدول الدروس</div>
          <table>
            <thead><tr><th>المادة</th><th>الصف</th><th>الشعبة</th><th>الكلي</th><th style="color:#86efac">الظاهر</th><th style="color:#fca5a5">المخفي</th><th>بمخرجات</th><th>بملاحظات</th></tr></thead>
            <tbody>${lessonRows}</tbody>
          </table>

          <!-- جدول التقييمات -->
          <div style="font-weight:700;font-size:10px;color:#92400e;background:#fef9c3;padding:4px 8px;border-radius:4px;margin:8px 0 4px">جدول التقييمات</div>
          <table>
            <thead><tr><th>المادة</th><th>الصف</th><th>الشعبة</th><th>التقييمات</th><th>المسندة</th><th>التسليمات</th><th>% الحل</th><th>% التصحيح</th></tr></thead>
            <tbody>${assessRows}</tbody>
          </table>
        </div>`;
    });

    // جمع المعلمين في أزواج (معلمان في كل صفحة)
    const pairedDetails = [];
    for (let i = 0; i < teacherDetails.length; i += 2) {
      const pair = teacherDetails.slice(i, i + 2);
      const isFirst = i === 0;
      pairedDetails.push(`
        <div style="${isFirst ? "" : "page-break-before:always;"}padding:4px 0">
          ${pair.join('<div style="border-top:2px dashed #e2e8f0;margin:10px 0"></div>')}
        </div>`);
    }

    const css = `
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
      @page { size: A4 landscape; margin: 8mm 12mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; font-feature-settings: normal; -webkit-font-feature-settings: normal; }
      body { font-family: 'Cairo', Arial, sans-serif; font-size: 10px; direction: rtl;
             -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; color: #1e293b; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 4px; font-size: 9px; }
      th { background: #7f1d1d !important; color: #fff !important; padding: 5px 4px; border: 1px solid #991b1b;
           text-align: center; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      td { padding: 4px 3px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle; }
      tr:hover td { background: inherit; }
      .page-header { background: #7f1d1d !important; color: white !important; padding: 10px 16px;
                     border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between;
                     align-items: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      [style*="background:linear-gradient"] { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      [style*="background:#"] { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    `;

    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar-u-nu-latn"><head>
      <meta charset="UTF-8"/>
      <title>تقرير قسم ${selectedDept}</title>
      <style>${css}</style>
    </head><body>
      <!-- رأس الصفحة الأولى -->
      <div class="page-header">
        <div>
          <div style="font-size:16px;font-weight:800">${schoolNameStr || "تقرير أداء القسم"}</div>
          <div style="font-size:11px;opacity:0.85;margin-top:3px">القسم: ${selectedDept}${schoolNameStr ? " | " + schoolNameStr : ""}</div>
        </div>
        <div style="text-align:left;font-size:9px;opacity:0.8">تاريخ التقرير: ${printDate}</div>
      </div>

      <!-- بطاقات الملخص -->
      ${summaryCards}

      <!-- جدول المعلمين -->
      <div style="font-weight:700;font-size:11px;color:#7f1d1d;margin-bottom:5px">ملخص أداء المعلمين</div>
      <table>
        <thead><tr>
          <th style="width:4%">#</th>
          <th style="width:18%">اسم المعلم</th>
          <th style="width:22%">الشعب</th>
          <th style="width:6%">الشعب</th>
          <th style="width:7%">المطلوب</th>
          <th style="width:7%">الظاهرة</th>
          <th style="width:7%">المخفية</th>
          <th style="width:7%">بمخرجات</th>
          <th style="width:7%">بملاحظات</th>
          <th style="width:10%">اكتمال الدروس</th>
          <th style="width:10%">نسبة المخرجات</th>
        </tr></thead>
        <tbody>${teacherRows}</tbody>
      </table>

      <!-- تفاصيل كل معلم (معلمان في كل صفحة) -->
      ${pairedDetails.join("")}
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 700);
  };

  /* ── توليد PDF من printRef (يلتقط كامل العرض بما فيه الأجزاء المخفية) ── */
  const generatePDF = async (customFileName = "report") => {
    const content = printRef.current;
    if (!content) return false;
    try {
      // إخفاء الروابط والأزرار في الـ PDF
      const links = content.querySelectorAll(".print\\:hidden, a, button");
      links.forEach(l => l.style.display = "none");

      const canvas = await html2canvas(content, {
        scale: 2.5, // جودة أعلى
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // استعادة العرض
      links.forEach(l => l.style.display = "");

      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgW = pdfW - 20;
      const imgH = (imgProps.height * imgW) / imgProps.width;

      let heightLeft = imgH;
      let position = 10;

      pdf.addImage(imgData, "JPEG", 10, position, imgW, imgH);
      heightLeft -= (pdfH - 20);

      while (heightLeft > 0) {
        position = heightLeft - imgH + 10;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 10, position, imgW, imgH);
        heightLeft -= (pdfH - 20);
      }

      pdf.save(`${customFileName}.pdf`);
      return true;
    } catch (err) {
      console.error("PDF Error:", err);
      return false;
    }
  };

  /* ── فتح Outlook بعد تنزيل PDF ── */
  const openOutlook = ({ subject = "", body = "", to = "" }) => {
    // نسخ النص للحافظة
    navigator.clipboard.writeText(body).catch(() => {});
    
    // نص مختصر جداً للـ URL
    const shortBody = `مرفق تقرير أداء. يرجى إرفاق ملف PDF من التنزيلات.`;
    
    // محاولة فتح Outlook Web
    const outlookWebUrl = `https://outlook.live.com/mail/0/deeplink/compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shortBody)}`;
    
    const win = window.open(outlookWebUrl, "_blank", "width=1200,height=800");
    
    // إذا لم يفتح، نستخدم mailto
    if (!win || win.closed || typeof win.closed === "undefined") {
      const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shortBody)}`;
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = mailtoLink;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 500);
      }, 600);
    }
  };

  /* ── إرسال بريد المعلم: ينزّل PDF ثم يفتح Outlook ── */
  const [emailLoading, setEmailLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipProgress, setZipProgress] = useState({ current: 0, total: 0 });

  /* ── توليد PDF كـ Blob (بدون حفظ مباشر) ── */
  const generatePDFBlobFromHTML = async (htmlContent) => {
    const printDate = new Date().toLocaleDateString("en-US");
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:1400px;height:900px;border:0;visibility:hidden";
    document.body.appendChild(iframe);
    try {
      iframe.contentDocument.write(`
        <!DOCTYPE html><html dir="rtl" lang="ar-u-nu-latn">
        <head>
          <meta charset="UTF-8"/>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            * { box-sizing:border-box; margin:0; padding:0; }
            body { font-family:'Cairo',Arial,sans-serif; font-size:10px; direction:rtl; background:#fff; color:#111; }
            .print-header { background:#7f1d1d !important; color:white !important; padding:8px 14px; border-radius:7px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; }
            table { width:100%; border-collapse:collapse; margin-bottom:6px; table-layout:fixed; }
            th { background:#7f1d1d !important; color:white !important; padding:4px 3px; border:1px solid #ccc; font-size:9px; text-align:center; }
            td { padding:3px 2px; border:1px solid #ddd; text-align:center; font-size:9px; word-break:break-word; }
            tr:nth-child(even) td { background:#fff5f5 !important; }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body></html>
      `);
      iframe.contentDocument.close();
      await new Promise(r => setTimeout(r, 800));
      const body = iframe.contentDocument.body;
      const canvas = await html2canvas(body, {
        scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff",
        width: body.scrollWidth, height: body.scrollHeight,
        windowWidth: body.scrollWidth, windowHeight: body.scrollHeight,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth() - 20;
      const pageH = pdf.internal.pageSize.getHeight() - 20;
      const imgH = (canvas.height * pageW) / canvas.width;
      let remaining = imgH, page = 0;
      while (remaining > 0) {
        if (page > 0) pdf.addPage();
        const srcY = page * pageH;
        pdf.addImage(imgData, "PNG", 10, 10 - srcY, pageW, imgH, "", "FAST");
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, pageH + 10, pageW + 20, 30, "F");
        remaining -= pageH; page++;
      }
      return pdf.output("arraybuffer");
    } finally {
      document.body.removeChild(iframe);
    }
  };

  /* ── بناء HTML كامل لتقرير معلم (مطابق للتقرير المعروض) ── */
  const buildTeacherReportHTML = (teacherName) => {
    const tLessons = (lessonsAgg || []).filter(l => l.teacherName === teacherName);
    const tAssess = (assessmentsAgg || []).filter(a => a.teacherName === teacherName);
    // حساب الإحصائيات (نفس منطق teacherStats)
    const rows = tLessons.map(l => {
      const trackKey = String(l.grade || "").trim() + "::" + String(l.section || "").trim();
      const track = trackIndex.get(trackKey) || "";
      const quotaData = getWeeklyQuota(l.grade, l.subjectName, track);
      const weeklyQ = quotaData.weeklyQuota;
      const required = calcRequired(weeklyQ, quotaData.ramadanQuota);
      const visible = l.visibleLessons || 0;
      const total = l.totalLessons || 0;
      const completion = required > 0 ? Math.min(100, (visible / required) * 100) : 0;
      const outcomes = total > 0 ? (l.lessonsWithOutcomes / total) * 100 : 0;
      const asmRow = tAssess.find(
        a => a.subjectCode === l.subjectCode ||
          (a.grade === l.grade && a.section === l.section && a.subjectName?.trim() === l.subjectName?.trim())
      );
      return {
        subjectName: l.subjectName, grade: l.grade, section: l.section,
        schoolName: l.schoolName, weeklyQuota: weeklyQ,
        required, visible, total,
        lessonsWithNotes: l.lessonsWithNotes || 0,
        lessonsWithSections: l.lessonsWithSections || 0,
        lessonsWithOutcomes: l.lessonsWithOutcomes || 0,
        isInTimetable: l.isInTimetable,
        completion, outcomes,
        assessmentsCount: asmRow?.assessmentsCount || 0,
        submissionsCount: asmRow?.submissionsCount || 0,
        solvePercentage: asmRow?.solvePercentage || 0,
        correctionPct: asmRow?.correctionCompletionPercentage || 0,
        assessmentsWithOutcomes: asmRow?.assessmentsWithOutcomes || 0,
      };
    });

    const totVisible = rows.reduce((s, r) => s + r.visible, 0);
    const totRequired = rows.reduce((s, r) => s + r.required, 0);
    const totAsmCount = rows.reduce((s, r) => s + r.assessmentsCount, 0);
    const totLessons = rows.reduce((s, r) => s + r.total, 0);
    const totOutcLess = rows.reduce((s, r) => s + r.lessonsWithOutcomes, 0);
    const totAsmOut = rows.reduce((s, r) => s + r.assessmentsWithOutcomes, 0);
    const lessonsCompletionRate = totRequired > 0 ? Math.min(100, (totVisible / totRequired) * 100) : 0;
    const outcomesRate = totLessons > 0 ? Math.min(100, (totOutcLess / totLessons) * 100) : 0;
    const asmOutcomesRate = totAsmCount > 0 ? Math.min(100, (totAsmOut / totAsmCount) * 100) : 0;
    const solveRate = rows.length > 0 ? rows.reduce((s, r) => s + r.solvePercentage, 0) / rows.length : 0;
    const correctionRows = rows.filter(r => r.submissionsCount > 0);
    const correctionRate = correctionRows.length > 0 ? correctionRows.reduce((s, r) => s + r.correctionPct, 0) / correctionRows.length : 0;

    const n = v => Number(v || 0).toLocaleString("en-US");
    const pc = v => `${Number(v || 0).toFixed(1)}%`;
    const cl = v => v >= 90 ? "#16a34a" : v >= 70 ? "#ca8a04" : "#dc2626";
    const bg = v => v >= 90 ? "#f0fdf4" : v >= 70 ? "#fefce8" : "#fef2f2";
    const mk = v => v >= 90 ? "✓" : v >= 70 ? "⚠" : "✗";
    const badge = (v, lbl) => `<span style="background:${bg(v)};color:${cl(v)};border:1px solid ${cl(v)};border-radius:999px;padding:1px 8px;font-size:10px;font-weight:700">${mk(v)} ${lbl}</span>`;

    // ── متبقي badge ──
    const rem = totRequired - totVisible;
    const completionBadge = totRequired > 0
      ? `<span style="background:${rem <= 0 ? "#dcfce7" : lessonsCompletionRate >= 70 ? "#fef9c3" : "#fee2e2"};color:${rem <= 0 ? "#166534" : lessonsCompletionRate >= 70 ? "#854d0e" : "#991b1b"};border-radius:999px;padding:1px 10px;font-size:11px;font-weight:700">${rem <= 0 ? "✓ مكتمل" : `متبقي ${n(Math.abs(rem))} درس`}</span>`
      : "";

    // ── صفوف الجدول الرئيسي ──
    const tableRows = rows.map((r, i) => {
      const compRatio = r.required > 0 ? r.visible / r.required : 0;
      const rowBg = compRatio < 0.7 && r.required > 0 ? "#fff1f2" : compRatio < 1 && r.required > 0 ? "#fffbeb" : i % 2 === 0 ? "#fff" : "#f0fdf4";
      const secPct = r.total > 0 ? (r.lessonsWithSections / r.total) * 100 : 0;
      return `<tr style="background:${rowBg}">
        <td style="border:1px solid #ddd;padding:3px;text-align:center;color:#888">${i + 1}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:right;font-weight:600">${r.subjectName}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center">${r.grade}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center">${r.section}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center">${r.weeklyQuota || "—"}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-weight:600">${r.required > 0 ? n(r.required) : "—"}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;font-weight:700;color:${cl(compRatio * 100)}">${n(r.visible)}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;color:${r.total - r.visible > 0 ? "#dc2626" : "#9ca3af"}">${n(r.total - r.visible)}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center">${n(r.lessonsWithNotes)}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center;color:${cl(r.lessonsWithOutcomes / Math.max(r.total, 1) * 100)}">${n(r.lessonsWithOutcomes)}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center">${badge(r.completion, pc(r.completion))}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center">${badge(secPct, secPct >= 90 ? "نعم" : "لا")}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center">${n(r.assessmentsCount)}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center">${n(r.submissionsCount)}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center">${badge(r.solvePercentage, pc(r.solvePercentage))}</td>
        <td style="border:1px solid #ddd;padding:3px;text-align:center">${badge(r.correctionPct, pc(r.correctionPct))}</td>
      </tr>`;
    }).join("");

    // ── التقرير الوصفي ──
    const descriptiveItems = [
      { bnd: "دروس بالأقسام", val: rows.reduce((s, r) => s + r.lessonsWithSections, 0), total: totLessons, desc: `${n(rows.reduce((s, r) => s + r.lessonsWithSections, 0))} من أصل ${n(totLessons)} درس مقسّم على أقسام` },
      { bnd: "دروس بملاحظات", val: rows.reduce((s, r) => s + r.lessonsWithNotes, 0), total: totLessons, desc: `${n(rows.reduce((s, r) => s + r.lessonsWithNotes, 0))} درس يحتوي على ملاحظات` },
      { bnd: "دروس بمخرجات", val: rows.reduce((s, r) => s + r.lessonsWithOutcomes, 0), total: totLessons, desc: `${n(rows.reduce((s, r) => s + r.lessonsWithOutcomes, 0))} من ${n(totLessons)} درس مرتبط بمخرجات التعلم` },
      { bnd: "تقييمات مكتملة", val: rows.reduce((s, r) => s + r.assessmentsWithOutcomes, 0), total: totAsmCount, desc: `${n(rows.reduce((s, r) => s + r.assessmentsWithOutcomes, 0))} تقييم من أصل ${n(totAsmCount)} مرتبط بنتاجات التعلم` },
      { bnd: "تقييمات مصحّحة", val: tAssess.reduce((s, a) => s + (a.correctedAssessments || 0), 0), total: totAsmCount, desc: `تم تصحيح ${n(tAssess.reduce((s, a) => s + (a.correctedAssessments || 0), 0))} من أصل ${n(totAsmCount)} تقييم` },
      { bnd: "نسبة حل التقييمات", val: solveRate, total: 100, desc: `متوسط نسبة حل الطلاب للتقييمات: ${pc(solveRate)}` },
      { bnd: "نسبة اكتمال الدروس", val: lessonsCompletionRate, total: 100, desc: `${n(totVisible)} درس ظاهر من المطلوب ${n(totRequired)} (${pc(lessonsCompletionRate)})` },
    ].map(row => ({ ...row, ratio: row.total > 0 ? (row.val / row.total) * 100 : row.val }));
    const sortedItems = [...descriptiveItems.filter(r => r.ratio < 90), ...descriptiveItems.filter(r => r.ratio >= 90)];
    const descriptiveRows = sortedItems.map((row, i) => {
      const isOk = row.ratio >= 90; const isWarn = row.ratio >= 70 && row.ratio < 90;
      const rBg = isOk ? "#f0fdf4" : isWarn ? "#fefce8" : "#fef2f2";
      const bClr = isOk ? "#16a34a" : isWarn ? "#ca8a04" : "#dc2626";
      const tClr = isOk ? "#14532d" : isWarn ? "#713f12" : "#7f1d1d";
      const mark = isOk ? "✓" : isWarn ? "⚠" : "✗";
      return `<tr style="background:${rBg};border-right:4px solid ${bClr}">
        <td style="border:1px solid #e5e7eb;padding:5px;text-align:center;color:#6b7280;font-weight:600">${i + 1}</td>
        <td style="border:1px solid #e5e7eb;padding:5px">
          <p style="font-weight:700;color:${tClr}">${row.bnd}</p>
          <p style="font-size:10px;color:${tClr};opacity:0.8;margin-top:2px">${row.desc}</p>
        </td>
        <td style="border:1px solid #e5e7eb;padding:5px;text-align:center;color:${bClr};font-weight:900;font-size:16px">${mark}</td>
      </tr>`;
    }).join("");

    // ── ملاحظات وتوصيات ──
    let notes = "";
    if (totVisible === 0) notes += `<div style="background:#450a0a;border-right:5px solid #7f1d1d;padding:8px;margin-bottom:6px;border-radius:4px;color:#fff;font-size:11px"><strong>⚠ لا توجد دروس ظاهرة:</strong> يجب إظهار جميع الدروس بناءً على الخطة الفصلية. المطلوب ${n(totRequired)} درساً وفق النصاب الأسبوعي (${n(ew)} أسبوع).</div>`;
    if (totVisible > 0 && lessonsCompletionRate < 100) notes += `<div style="background:#fee2e2;border-right:4px solid #dc2626;padding:6px;margin-bottom:4px;border-radius:4px;color:#7f1d1d;font-size:11px"><strong>✗ الدروس غير مكتملة:</strong> يجب إضافة باقي الدروس. متبقٍ ${n(totRequired - totVisible)} درس من أصل ${n(totRequired)} (${pc(lessonsCompletionRate)} مكتمل).</div>`;
    if (outcomesRate < 70) notes += `<div style="background:#fee2e2;border-right:4px solid #dc2626;padding:6px;margin-bottom:4px;border-radius:4px;color:#7f1d1d;font-size:11px"><strong>✗ نتاجات التعلم:</strong> ربط الدروس بنتاجات التعلم بشكل كامل. نسبة الربط الحالية ${pc(outcomesRate)}.</div>`;
    if (asmOutcomesRate < 70) notes += `<div style="background:#fee2e2;border-right:4px solid #dc2626;padding:6px;margin-bottom:4px;border-radius:4px;color:#7f1d1d;font-size:11px"><strong>✗ التقييمات:</strong> إضافة نتاجات التعلم للتقييمات. يرجى إسناد التقييم وإظهاره للطلاب. نسبة الاكتمال الحالية ${pc(asmOutcomesRate)}.</div>`;
    if (solveRate < 50) notes += `<div style="background:#fee2e2;border-right:4px solid #dc2626;padding:6px;margin-bottom:4px;border-radius:4px;color:#7f1d1d;font-size:11px"><strong>✗ نسبة الحل:</strong> رفع نسبة حل الطلاب. المتوسط الحالي ${pc(solveRate)} (المطلوب ≥ 50%).</div>`;
    if (correctionRate < 80 && totAsmCount > 0) notes += `<div style="background:#fef9c3;border-right:4px solid #ca8a04;padding:6px;margin-bottom:4px;border-radius:4px;color:#713f12;font-size:11px"><strong>⚠ التصحيح:</strong> رفع نسبة تصحيح التقييمات. النسبة الحالية ${pc(correctionRate)}.</div>`;
    if (totVisible > 0 && lessonsCompletionRate >= 100 && outcomesRate >= 70 && solveRate >= 50) notes += `<div style="background:#dcfce7;border-right:4px solid #16a34a;padding:6px;border-radius:4px;color:#14532d;font-size:11px"><strong>✓ أداء جيد!</strong> استمر في المحافظة على مستوى الأداء الجيد.</div>`;

    // ── بنود المعلم ──
    const duties = [
      { bnd: "الجدول", desc: "إضافة جدول الحصص الدراسية في بداية كل فصل دراسي وتحديثه باستمرار.", ok: lessonsCompletionRate >= 90 },
      { bnd: "الدروس", desc: "إظهار الدرس النموذجي وإضافة تاريخ نشره.", ok: outcomesRate >= 70 },
      { bnd: "التقييمات", desc: "إضافة تاريخ البداية والاستحقاق ثم إسناد التقييم — في حالة عدم توفره يتم إضافة تقييم ختامي.", ok: asmOutcomesRate >= 70 && solveRate >= 50 },
    ];
    const dutyRows = duties.map((d, i) => `<tr style="background:${i % 2 === 0 ? "#f0fdf4" : "#fff"}">
      <td style="border:1px solid #e5e7eb;padding:7px;text-align:right;font-size:12px;border-right:4px solid ${d.ok ? "#16a34a" : "#dc2626"}">${d.desc}</td>
      <td style="border:1px solid #e5e7eb;padding:7px;text-align:center;font-weight:700;font-size:12px;color:#166534">${d.bnd}</td>
    </tr>`).join("");

    const schoolName = termSettings.schoolName || rows[0]?.schoolName || "";
    const sigNames = [
      { title: "مدير/ة المدرسة", name: termSettings.principalName },
      { title: "النائب الأكاديمي", name: termSettings.viceNames },
      { title: "منسق المشاريع الإلكترونية", name: termSettings.coordinatorName },
    ];

    return `
      <div style="background:#7f1d1d;color:#fff;padding:10px 16px;border-radius:6px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:15px;font-weight:800">تقرير أداء معلم — نظام قطر التعليم 2025-2026</div>
          ${schoolName ? `<div style="font-size:11px;opacity:0.85;margin-top:2px">${schoolName}</div>` : ""}
        </div>
        <div style="font-size:10px;opacity:0.75">${new Date().toLocaleDateString("en-US")}</div>
      </div>
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px;background:#fef2f2;border:1px solid #fca5a5;padding:6px 12px;margin-bottom:10px;font-size:11px;border-radius:4px">
        <span>اسم المعلم: <strong>${teacherName}</strong> ${completionBadge}</span>
        <span>المدرسة: <strong>${schoolName || "—"}</strong></span>
        <span>من: <strong>${termSettings.filterStart || termSettings.start || "—"}</strong></span>
        <span>إلى: <strong>${termSettings.filterEnd || termSettings.end || "—"}</strong></span>
        <span>(${n(ew)} أسبوع)</span>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:10px;table-layout:fixed">
        <tr>
          ${[["نسبة اكتمال الدروس", lessonsCompletionRate], ["نسبة الدروس بالمخرجات", outcomesRate], ["نسبة اكتمام التقييمات", asmOutcomesRate], ["نسبة حل التقييمات", solveRate]]
        .map(([lbl, val]) => `<td style="width:25%;padding:3px">
              <div style="border:2px solid ${cl(val)};border-radius:6px;padding:6px 4px;text-align:center;background:${bg(val)}">
                <div style="font-size:9px;color:#555;margin-bottom:3px">${lbl}</div>
                <div style="color:${cl(val)};font-size:15px;font-weight:800;line-height:1">${pc(val)}</div>
              </div>
            </td>`).join("")}
        </tr>
      </table>
      <div style="overflow-x:auto;margin-bottom:12px;border-radius:4px;border:1px solid #ddd">
        <table style="width:100%;border-collapse:collapse;font-size:9px;direction:rtl">
          <thead><tr style="background:#7f1d1d;color:white">
            <th style="border:1px solid #9b2c2c;padding:4px">#</th>
            <th style="border:1px solid #9b2c2c;padding:4px;text-align:right">المادة</th>
            <th style="border:1px solid #9b2c2c;padding:4px">الصف</th>
            <th style="border:1px solid #9b2c2c;padding:4px">الشعبة</th>
            <th style="border:1px solid #9b2c2c;padding:4px">نصاب/أسبوع</th>
            <th style="border:1px solid #9b2c2c;padding:4px">المطلوب</th>
            <th style="border:1px solid #9b2c2c;padding:4px">الظاهرة</th>
            <th style="border:1px solid #9b2c2c;padding:4px">المخفية</th>
            <th style="border:1px solid #9b2c2c;padding:4px">مع ملاحظات</th>
            <th style="border:1px solid #9b2c2c;padding:4px">مع مخرجات</th>
            <th style="border:1px solid #9b2c2c;padding:4px">اكتمال الدروس</th>
            <th style="border:1px solid #9b2c2c;padding:4px">ربط الجدول</th>
            <th style="border:1px solid #9b2c2c;padding:4px">التقييمات</th>
            <th style="border:1px solid #9b2c2c;padding:4px">التسليمات</th>
            <th style="border:1px solid #9b2c2c;padding:4px">نسبة الحل</th>
            <th style="border:1px solid #9b2c2c;padding:4px">نسبة التصحيح</th>
          </tr></thead>
          <tbody>${tableRows || `<tr><td colspan="16" style="text-align:center;padding:10px;color:#999">لا توجد بيانات</td></tr>`}</tbody>
        </table>
      </div>
      <div style="margin-bottom:10px;border:1px solid #d1d5db;border-radius:6px;overflow:hidden">
        <div style="background:#1e3a5f;color:#fff;padding:7px 12px;font-weight:700;font-size:12px;text-align:center;letter-spacing:0.5px">
          📋 التقرير الوصفي
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:10px;direction:rtl">
          <thead>
            <tr style="background:#e5e7eb">
              <th style="border:1px solid #d1d5db;padding:5px;width:28px;text-align:center">#</th>
              <th style="border:1px solid #d1d5db;padding:5px 10px;text-align:right">البند والتفاصيل</th>
              <th style="border:1px solid #d1d5db;padding:5px;width:52px;text-align:center">الحالة</th>
            </tr>
          </thead>
          <tbody>${descriptiveRows}</tbody>
        </table>
      </div>
      <div style="margin-bottom:10px;border:1px solid #d1d5db;border-radius:6px;overflow:hidden">
        <div style="background:#1e3a5f;color:#fff;padding:7px 12px;font-weight:700;font-size:12px;text-align:center;letter-spacing:0.5px">
          💬 ملاحظات وتوصيات
        </div>
        <div style="padding:8px 10px">${notes || '<div style="color:#16a34a;font-size:11px;padding:4px">✓ لا توجد ملاحظات — أداء ممتاز</div>'}</div>
      </div>
      <div style="margin-bottom:10px;border:1px solid #d1d5db;border-radius:6px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse;direction:rtl">
          <thead><tr style="background:#166534">
            <th style="border:1px solid #14532d;padding:7px 10px;text-align:right;color:#fff;font-weight:700;font-size:11px;width:80%">مهام المعلم على نظام قطر للتعليم</th>
            <th style="border:1px solid #14532d;padding:7px;text-align:center;color:#fff;font-weight:700;font-size:11px;width:20%">البند</th>
          </tr></thead>
          <tbody>${dutyRows}</tbody>
        </table>
      </div>
      <table style="width:100%;border-collapse:collapse;border-top:2px solid #e5e7eb;margin-top:16px">
        <tr>
          ${sigNames.map(sig => `<td style="width:33%;padding:12px 8px;text-align:center;vertical-align:top">
            <div style="border-top:2px solid #9ca3af;padding-top:8px">
              <div style="font-weight:700;font-size:11px">${sig.title}</div>
              ${sig.name ? `<div style="font-size:10px;color:#374151;margin-top:3px">${sig.name}</div>` : ""}
              <div style="font-size:10px;color:#9ca3af;margin-top:14px">التوقيع: ________________</div>
            </div>
          </td>`).join("")}
        </tr>
      </table>`;
  };

  /* ── تحميل كل تقارير القسم كملفات منفصلة ── */
  const downloadAllDeptReportsSeparate = async () => {
    if (!selectedDept || !deptStats?.teachers?.length) return;
    setZipLoading(true);
    const teachers = deptStats.teachers;
    const from = termSettings.filterStart || termSettings.start || "بداية_الفصل";
    const to = termSettings.filterEnd || termSettings.end || "نهاية_الفصل";

    for (let i = 0; i < teachers.length; i++) {
      const tc = teachers[i];
      setZipProgress({ current: i + 1, total: teachers.length });
      try {
        const htmlContent = buildTeacherReportHTML(tc.teacherName);
        const pdfBuffer = await generatePDFBlobFromHTML(htmlContent);
        const safeName = tc.teacherName.replace(/[^\w\u0600-\u06FF]/g, "_");
        const fileName = `${safeName}_${from}_${to}.pdf`;
        
        // إنشاء Blob وتحميل الملف
        const blob = new Blob([pdfBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 100);
        
        // انتظار قليلاً بين كل تحميل
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error(`Error generating PDF for ${tc.teacherName}:`, e);
      }
    }
    
    setZipLoading(false);
    setZipProgress({ current: 0, total: 0 });
    alert(`✓ تم تنزيل ${teachers.length} تقرير بنجاح`);
  };

  const handleTeacherEmail = async () => {
    const name = selectedTeacher;
    const from = termSettings.filterStart || termSettings.start || "بداية_الفصل";
    const to = termSettings.filterEnd || termSettings.end || "نهاية_الفصل";
    const fileName = `teacher-report-${name.replace(/\s+/g, "_")}-${from}-${to}`;

    setEmailLoading(true);
    const ok = await generatePDF(fileName);
    setEmailLoading(false);

    const subject = `تقرير أداء معلّم – ${name} – الفترة من ${from} إلى ${to}`;
    const body = `السلام عليكم،\n\nمرفق تقرير أداء المعلّم ${name} للفترة من ${from} إلى ${to}.\n\nتم تنزيل نسخة الـPDF على جهازك باسم:\n${fileName}.pdf\n\n** يرجى إرفاق الملف يدوياً مع هذه الرسالة **\n\nلإرفاق الملف:\n1. انقر على زر "إرفاق" (📎) في Outlook\n2. اختر الملف من مجلد التنزيلات: ${fileName}.pdf\n\nبناءً على بيانات لوحة متابعة التعليم.\n\nمع التحية.`;

    openOutlook({ subject, body });
    
    // إظهار رسالة توضيحية
    alert(`✓ تم تنزيل التقرير: ${fileName}.pdf\n\nتم فتح Outlook Web.\nيرجى إرفاق الملف يدوياً من مجلد التنزيلات.`);
  };

  /* ── إرسال بريد القسم: ينزّل PDF ثم يفتح Outlook ── */
  const handleDeptEmail = async () => {
    const dept = selectedDept;
    const from = termSettings.filterStart || termSettings.start || "بداية_الفصل";
    const to = termSettings.filterEnd || termSettings.end || "نهاية_الفصل";
    const fileName = `dept-report-${dept.replace(/\s+/g, "_")}-${from}-${to}`;

    setEmailLoading(true);
    const ok = await generatePDF(fileName);
    setEmailLoading(false);

    const subject = `تقرير أداء قسم – ${dept} – الفترة من ${from} إلى ${to}`;
    const body = `السلام عليكم،\n\nمرفق تقرير أداء القسم ${dept} للفترة من ${from} إلى ${to}.\n\nتم تنزيل نسخة الـPDF على جهازك باسم:\n${fileName}.pdf\n\n** يرجى إرفاق الملف يدوياً مع هذه الرسالة **\n\nلإرفاق الملف:\n1. انقر على زر "إرفاق" (📎) في Outlook\n2. اختر الملف من مجلد التنزيلات: ${fileName}.pdf\n\nبناءً على بيانات لوحة متابعة التعليم.\n\nمع التحية.`;

    openOutlook({ subject, body });
    
    // إظهار رسالة توضيحية
    alert(`✓ تم تنزيل التقرير: ${fileName}.pdf\n\nتم فتح Outlook Web.\nيرجى إرفاق الملف يدوياً من مجلد التنزيلات.`);
  };

  const isLoading = lessonsAgg === undefined || assessmentsAgg === undefined || subjectsQuota === undefined || classTracks === undefined;

  if (isLoading) {
    return (
      <AppLayout title="التقارير">
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const teacherNames = [...new Set(
    lessonsAgg
      .filter(l => !filterSubject || (l.subjectName || "").trim() === filterSubject)
      .map(l => l.teacherName)
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "ar"));

  const MAROON = "#7f1d1d";

  return (
    <AppLayout title="التقارير">
      <div className="space-y-4 px-4 md:px-6" dir="rtl">

        {/* ── العنوان ── */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5" style={{ background: `${MAROON}18` }}>
            <FileText className="h-6 w-6" style={{ color: MAROON }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">التقارير</h1>
            <p className="text-sm text-slate-500">تقارير أداء المعلمين والأقسام</p>
          </div>
        </div>

        {/* ── التبويبات ── */}
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 w-fit shadow-sm">
          {[
            { val: "teacher", label: "تقرير معلم", icon: <Users className="h-4 w-4" /> },
            { val: "overview", label: "النظرة الشاملة", icon: <LayoutGrid className="h-4 w-4" /> },
            { val: "dept", label: "تقرير قسم تفصيلي", icon: <FileText className="h-4 w-4" /> },
          ].map(tab => (
            <button key={tab.val} onClick={() => setActiveTab(tab.val)}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all"
              style={activeTab === tab.val
                ? { background: MAROON, color: "#fff", boxShadow: "0 1px 4px rgba(127,29,29,0.25)" }
                : { background: "transparent", color: "#64748b" }}>
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── فلتر التواريخ المشترك ── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3" dir="rtl"
          style={{ borderRight: `4px solid ${MAROON}` }}>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">من تاريخ</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                style={{ direction: "ltr", focusRingColor: MAROON }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">إلى تاريخ</label>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                style={{ direction: "ltr" }}
              />
            </div>
            {(fromDate || toDate) && (
              <button
                onClick={resetDates}
                className="rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-slate-50"
                style={{ borderColor: MAROON, color: MAROON }}
              >
                إعادة تعيين
              </button>
            )}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">الفترة:</span>
              <strong className="text-slate-700">{termSettings.filterStart || termSettings.start || "—"}</strong>
              <span className="text-slate-400">←</span>
              <strong className="text-slate-700">{termSettings.filterEnd || termSettings.end || "—"}</strong>
              <span className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white" style={{ background: MAROON }}>
                {toAr(termSettings.effectiveWeeks)} أسبوع فعلي
              </span>
            </div>
          </div>
        </div>

        {/* ── تنبيه تطبيق رمضان والإجازات ── */}
        {(termSettings.ramadanWeeks > 0 || (termSettings.effectiveWeeks - termSettings.regularWeeks - termSettings.ramadanWeeks) > 0) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex flex-wrap items-start gap-3 mb-2">
            <span className="text-lg leading-none">🌙</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold mb-1">تم تطبيق تعديلات على حساب الدروس المطلوبة</p>
              <div className="flex flex-wrap gap-2 text-xs text-amber-800">
                {termSettings.ramadanWeeks > 0 && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 border border-amber-300">
                    🌙 رمضان: <strong>{toAr(termSettings.ramadanWeeks)} أسبوع</strong>
                    {termSettings.ramadanStart && termSettings.ramadanEnd && (
                      <span className="text-amber-600">
                        ({new Date(termSettings.ramadanStart).toLocaleDateString("ar-QA")} – {new Date(termSettings.ramadanEnd).toLocaleDateString("ar-QA")})
                      </span>
                    )}
                    — نصاب مخفَّض
                  </span>
                )}
                {(termSettings.effectiveWeeks - termSettings.regularWeeks - termSettings.ramadanWeeks) > 0 && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 border border-amber-300">
                    📅 إجازات: <strong>{toAr(termSettings.effectiveWeeks - termSettings.regularWeeks - termSettings.ramadanWeeks)} أسبوع</strong> — محذوفة
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 border border-green-300 text-green-800">
                  ✅ عادي: <strong>{toAr(termSettings.regularWeeks)}</strong> | رمضان: <strong>{toAr(termSettings.ramadanWeeks)}</strong> | إجمالي: <strong>{toAr(termSettings.effectiveWeeks)}</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="hidden" />

          {/* ══════════════════ تبويب تقرير المعلم ══════════════════ */}
          <TabsContent value="teacher">
            {/* زر الرجوع لتقرير القسم */}
            {cameFromDept && (
              <div className="mb-3" dir="rtl">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-red-800 text-red-800 hover:bg-red-50"
                  onClick={() => {
                    setCameFromDept(false);
                    setActiveTab("dept");
                  }}
                >
                  ← رجوع إلى تقرير قسم {selectedDept}
                </Button>
              </div>
            )}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3" dir="rtl"
              style={{ borderRight: `4px solid #6366f1` }}>
              <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-48">
                  <label className="mb-1 block text-xs font-semibold text-slate-500">فلتر بالمادة</label>
                  <Select
                    value={filterSubject}
                    onValueChange={v => { setFilterSubject(v === "__all__" ? "" : v); setSelectedTeacher(""); }}
                  >
                    <SelectTrigger className="rounded-lg border-slate-300">
                      <SelectValue placeholder="-- كل المواد --" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 overflow-y-auto">
                      <SelectItem value="__all__">-- كل المواد --</SelectItem>
                      {departments.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-52">
                  <label className="mb-1 block text-xs font-semibold text-slate-500">
                    اختر المعلم {filterSubject && <span className="text-xs text-slate-400">({teacherNames.length} معلم)</span>}
                  </label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger className="rounded-lg border-slate-300">
                      <SelectValue placeholder="-- اختر المعلم --" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 overflow-y-auto">
                      {teacherNames.map(n => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedTeacher && teacherStats.rows.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={handlePrint} className="gap-2" size="sm"
                      style={{ background: MAROON, color: "#fff" }}>
                      <Printer className="h-4 w-4" /> طباعة التقرير
                    </Button>
                    <Button
                      onClick={() => {
                        const name = selectedTeacher;
                        const from = termSettings.filterStart || termSettings.start || "بداية_الفصل";
                        const to = termSettings.filterEnd || termSettings.end || "نهاية_الفصل";
                        generatePDF(`teacher-report-${name.replace(/\s+/g, "_")}-${from}-${to}`);
                      }}
                      variant="outline"
                      className="gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                      size="sm"
                    >
                      <Download className="h-4 w-4" /> تحميل PDF
                    </Button>
                    <Button onClick={handleTeacherEmail} disabled={emailLoading} variant="outline" className="gap-2" size="sm">
                      {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      {emailLoading ? "جاري توليد PDF..." : "إرسال بالبريد"}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {selectedTeacher && teacherStats.rows.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">لا توجد بيانات لهذا المعلم</div>
            )}

            {selectedTeacher && teacherStats.rows.length > 0 && (
              <div ref={printRef}>
                {/* ── رأس التقرير ── */}
                <div
                  className="mb-2 p-3 text-center text-white text-lg font-bold rounded"
                  style={{ background: "#7f1d1d", color: "#fff", padding: "8px", textAlign: "center", fontWeight: 700, fontSize: "16px", borderRadius: "4px", marginBottom: "8px" }}
                >
                  تقرير أداء معلم على نظام قطر التعليم 2025-2026
                </div>

                <div
                  className="mb-3 flex flex-wrap justify-between gap-2 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm"
                  style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "4px", background: "#fef2f2", border: "1px solid #fca5a5", padding: "6px 12px", marginBottom: "10px", fontSize: "11px", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
                >
                  <span className="flex items-center gap-2 flex-wrap">
                    اسم المعلم: <strong>{selectedTeacher}</strong>
                    {(() => {
                      const totalVisible = teacherStats.rows.reduce((s, r) => s + r.visible, 0);
                      const totalRequired = teacherStats.rows.reduce((s, r) => s + r.required, 0);
                      if (!totalRequired) return null;
                      const rem = totalRequired - totalVisible;
                      const completion = (totalVisible / totalRequired) * 100;
                      const isComplete = rem <= 0;
                      return (
                        <span style={{
                          display: "inline-block",
                          background: isComplete ? "#dcfce7" : completion >= 70 ? "#fef9c3" : "#fee2e2",
                          color: isComplete ? "#166534" : completion >= 70 ? "#854d0e" : "#991b1b",
                          border: `1px solid ${isComplete ? "#86efac" : completion >= 70 ? "#fde047" : "#fca5a5"}`,
                          borderRadius: "999px", padding: "1px 10px", fontSize: "11px", fontWeight: 700,
                          WebkitPrintColorAdjust: "exact", printColorAdjust: "exact",
                        }}>
                          {isComplete ? "✓ مكتمل" : `متبقي ${toAr(Math.abs(rem))} درس`}
                        </span>
                      );
                    })()}
                  </span>
                  <span>المدرسة: <strong>{teacherStats.rows[0]?.schoolName || "—"}</strong></span>
                  <span>من: <strong>{termSettings.filterStart || termSettings.start || "—"}</strong></span>
                  <span>إلى: <strong>{termSettings.filterEnd || termSettings.end || "—"}</strong></span>
                  <span>({toAr(termSettings.effectiveWeeks)} أسبوع)</span>
                </div>

                {/* ── بطاقات الملخص الأربع (مضغوطة) ── */}
                <div
                  className="mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2"
                  style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px", marginBottom: "8px" }}
                >
                  {[
                    { lbl: "نسبة اكتمال الدروس", val: teacherStats.lessonsCompletionRate },
                    { lbl: "نسبة الدروس بالمخرجات", val: teacherStats.outcomesRate },
                    { lbl: "نسبة اكتمام التقييمات", val: teacherStats.asmOutcomesRate },
                    { lbl: "نسبة حل التقييمات", val: teacherStats.solveRate },
                  ].map((s, i) => (
                    <div
                      key={i}
                      className="rounded border-2 text-center"
                      style={{ borderColor: pctColor(s.val), borderWidth: "2px", borderStyle: "solid", borderRadius: "5px", padding: "4px 6px", textAlign: "center", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
                    >
                      <p style={{ fontSize: "9px", color: "#555", marginBottom: "2px" }}>{s.lbl}</p>
                      <p style={{ color: pctColor(s.val), fontSize: "14px", fontWeight: 700 }}>
                        {s.val.toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>

                {/* ── جدول الشعب ── */}
                <div className="overflow-x-auto rounded border mb-4" dir="rtl">
                  <table className="w-full border-collapse text-xs text-center" dir="rtl">
                    <thead>
                      <tr style={{ background: "#7f1d1d", color: "white" }}>
                        <th className="border p-2 text-center">#</th>
                        <th className="border p-2 text-right">المادة</th>
                        <th className="border p-2 text-center">الصف</th>
                        <th className="border p-2 text-center">الشعبة</th>
                        <th className="border p-2 text-center">نصاب/أسبوع</th>
                        <th className="border p-2 text-center">المطلوب</th>
                        <th className="border p-2 text-center">الظاهرة</th>
                        <th className="border p-2 text-center">المخفية</th>
                        <th className="border p-2 text-center">مع ملاحظات</th>
                        <th className="border p-2 text-center">مع مخرجات</th>
                        <th className="border p-2 text-center">اكتمال الدروس</th>
                        <th className="border p-2 text-center">ربط الجدول</th>
                        <th className="border p-2 text-center">التقييمات</th>
                        <th className="border p-2 text-center">التسليمات</th>
                        <th className="border p-2 text-center">نسبة الحل</th>
                        <th className="border p-2 text-center">نسبة التصحيح</th>
                        <th className="border p-2 text-center print:hidden">رابط الدرس</th>
                        <th className="border p-2 text-center print:hidden">رابط التقييم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherStats.rows.map((r, i) => {
                        const sectionsPct = r.total > 0 ? (r.lessonsWithSections / r.total) * 100 : 0;
                        const compRatio = r.required > 0 ? r.visible / r.required : 0;
                        const visClx = compRatio >= 1 ? "text-emerald-700 font-bold" : compRatio >= 0.7 ? "text-amber-700 font-bold" : "text-rose-700 font-bold";
                        const hidClx = r.total - r.visible > 0 ? "text-rose-600 font-medium" : "text-slate-400";
                        const outClx = r.lessonsWithOutcomes / Math.max(r.total, 1) >= 0.8 ? "text-emerald-700" : r.lessonsWithOutcomes / Math.max(r.total, 1) >= 0.5 ? "text-amber-700" : "text-rose-600";
                        return (
                          <tr
                            key={i}
                            className={compRatio < 0.7 && r.required > 0 ? "bg-rose-50/40" : compRatio < 1 && r.required > 0 ? "bg-amber-50/30" : i % 2 === 0 ? "bg-white" : "bg-emerald-50/20"}
                          >
                            <td className="border p-1.5 text-center text-muted-foreground">{i + 1}</td>
                            <td className="border p-1.5 text-right font-medium">{r.subjectName}</td>
                            <td className="border p-1.5 text-center">{r.grade}</td>
                            <td className="border p-1.5 text-center">{r.section}</td>
                            <td className="border p-1.5 text-center">{toAr(r.weeklyQuota) || "—"}</td>
                            <td className="border p-1.5 text-center font-medium">{r.required > 0 ? toAr(r.required) : "—"}</td>
                            <td className={`border p-1.5 text-center ${visClx}`}>{toAr(r.visible)}</td>
                            <td className={`border p-1.5 text-center ${hidClx}`}>{toAr(r.total - r.visible)}</td>
                            <td className="border p-1.5 text-center">{toAr(r.lessonsWithNotes)}</td>
                            <td className={`border p-1.5 text-center ${outClx}`}>{toAr(r.lessonsWithOutcomes)}</td>
                            <td className="border p-1.5">
                              <StatusBadge pct={r.completion} label={`${r.completion.toFixed(1)}%`} />
                            </td>
                            <td className="border p-1.5 text-center">
                              <StatusBadge pct={sectionsPct} label={sectionsPct >= 90 ? "نعم" : "لا"} />
                            </td>
                            <td className="border p-1.5 text-center">{toAr(r.assessmentsCount)}</td>
                            <td className="border p-1.5 text-center">{toAr(r.submissionsCount)}</td>
                            <td className="border p-1.5">
                              <StatusBadge pct={r.solvePercentage} label={pct(r.solvePercentage)} />
                            </td>
                            <td className="border p-1.5">
                              <StatusBadge pct={r.correctionPct} label={pct(r.correctionPct)} />
                            </td>
                            <td className="border p-1.5 print:hidden text-center">
                              {r.subjectUrl
                                ? <a href={r.subjectUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-white" style={{ background: "#1d4ed8" }}>🔗 فتح</a>
                                : <span className="text-xs text-gray-400">—</span>}
                            </td>
                            <td className="border p-1.5 print:hidden text-center">
                              {r.assessmentsUrl
                                ? <a href={r.assessmentsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-white" style={{ background: "#7e22ce" }}>🔗 فتح</a>
                                : <span className="text-xs text-gray-400">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── التقرير الوصفي ── */}
                <div className="mb-4 rounded border" dir="rtl" style={{ pageBreakInside: "avoid" }}>
                  <div
                    className="p-2 text-white text-center font-bold text-sm"
                    style={{ background: "#374151", color: "#fff", padding: "6px", fontWeight: 700 }}
                  >
                    التقرير الوصفي
                  </div>
                  <table className="w-full border-collapse text-sm" dir="rtl">
                    <thead>
                      <tr style={{ background: "#e5e7eb", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                        <th className="border p-2 text-center w-8" style={{ border: "1px solid #ddd", padding: "5px", width: "30px" }}>#</th>
                        <th className="border p-2 text-right" style={{ border: "1px solid #ddd", padding: "5px" }}>البند</th>
                        <th className="border p-2 text-center w-16" style={{ border: "1px solid #ddd", padding: "5px", width: "70px" }}>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const totLessons = teacherStats.rows.reduce((s, r) => s + r.total, 0);
                        const totVisible = teacherStats.totVisible;
                        const totRequired = teacherStats.totRequired;
                        const items = [
                          {
                            bnd: "دروس بالأقسام",
                            val: teacherStats.rows.reduce((s, r) => s + r.lessonsWithSections, 0),
                            total: totLessons,
                            desc: `${toAr(teacherStats.rows.reduce((s, r) => s + r.lessonsWithSections, 0))} من أصل ${toAr(totLessons)} درس مقسّم على أقسام`,
                          },
                          {
                            bnd: "دروس بملاحظات",
                            val: teacherStats.rows.reduce((s, r) => s + r.lessonsWithNotes, 0),
                            total: totLessons,
                            desc: `${toAr(teacherStats.rows.reduce((s, r) => s + r.lessonsWithNotes, 0))} درس يحتوي على ملاحظات`,
                          },
                          {
                            bnd: "دروس بمخرجات",
                            val: teacherStats.rows.reduce((s, r) => s + r.lessonsWithOutcomes, 0),
                            total: totLessons,
                            desc: `${toAr(teacherStats.rows.reduce((s, r) => s + r.lessonsWithOutcomes, 0))} من ${toAr(totLessons)} درس مرتبط بمخرجات التعلم`,
                          },
                          {
                            bnd: "تقييمات مكتملة",
                            val: teacherStats.rows.reduce((s, r) => s + r.assessmentsWithOutcomes, 0),
                            total: teacherStats.rows.reduce((s, r) => s + r.assessmentsCount, 0),
                            desc: `${toAr(teacherStats.rows.reduce((s, r) => s + r.assessmentsWithOutcomes, 0))} تقييم من أصل ${toAr(teacherStats.rows.reduce((s, r) => s + r.assessmentsCount, 0))} مرتبط بنتاجات التعلم`,
                          },
                          {
                            bnd: "تقييمات مصحّحة",
                            val: teacherAssessments.reduce((s, a) => s + (a.correctedAssessments || 0), 0),
                            total: teacherStats.totAsmCount,
                            desc: `تم تصحيح ${toAr(teacherAssessments.reduce((s, a) => s + (a.correctedAssessments || 0), 0))} من أصل ${toAr(teacherStats.totAsmCount)} تقييم`,
                          },
                          {
                            bnd: "نسبة حل التقييمات",
                            val: teacherStats.solveRate,
                            total: 100,
                            desc: `متوسط نسبة حل الطلاب للتقييمات: ${pct(teacherStats.solveRate)}`,
                          },
                          {
                            bnd: "نسبة اكتمال الدروس",
                            val: teacherStats.lessonsCompletionRate,
                            total: 100,
                            desc: `${toAr(totVisible)} درس ظاهر من المطلوب ${toAr(totRequired)} (${teacherStats.lessonsCompletionRate.toFixed(1)}%)`,
                          },
                        ].map(row => {
                          const ratio = row.total > 0 ? (row.val / row.total) * 100 : row.val;
                          return { ...row, ratio };
                        });

                        // النواقص أولاً (ratio < 90) ثم المكتملة
                        const sorted = [
                          ...items.filter(r => r.ratio < 90),
                          ...items.filter(r => r.ratio >= 90),
                        ];

                        return sorted.map((row, i) => {
                          const isOk = row.ratio >= 90;
                          const isWarn = row.ratio >= 70 && row.ratio < 90;
                          const rowBg = isOk ? "#f0fdf4" : isWarn ? "#fefce8" : "#fef2f2";
                          const borderClr = isOk ? "#16a34a" : isWarn ? "#ca8a04" : "#dc2626";
                          const textClr = isOk ? "#14532d" : isWarn ? "#713f12" : "#7f1d1d";
                          const mark = isOk ? "✓" : isWarn ? "⚠" : "✗";
                          return (
                            <tr key={i} style={{ background: rowBg, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact", borderRight: `4px solid ${borderClr}` }}>
                              <td className="border p-2 text-center" style={{ border: "1px solid #e5e7eb", padding: "6px", color: "#6b7280", fontWeight: 600 }}>{i + 1}</td>
                              <td className="border p-2" style={{ border: "1px solid #e5e7eb", padding: "6px" }}>
                                <p style={{ fontWeight: 700, color: textClr }}>{row.bnd}</p>
                                <p style={{ fontSize: "11px", color: textClr, opacity: 0.8, marginTop: "2px" }}>{row.desc}</p>
                              </td>
                              <td className="border p-2 text-center" style={{ border: "1px solid #e5e7eb", padding: "6px", textAlign: "center" }}>
                                <span style={{ color: borderClr, fontWeight: 900, fontSize: "18px" }}>{mark}</span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* ── ملاحظات وتوصيات ── */}
                <div
                  className="mb-4 rounded border"
                  dir="rtl"
                  style={{ marginBottom: "12px", border: "1px solid #ddd", borderRadius: "6px", pageBreakInside: "avoid" }}
                >
                  <div
                    className="p-2 text-white text-center font-bold text-sm"
                    style={{ background: "#374151", color: "#fff", padding: "6px", textAlign: "center", fontWeight: 700, fontSize: "12px" }}
                  >
                    ملاحظات وتوصيات
                  </div>
                  <div className="p-3 text-sm space-y-1 text-right" style={{ padding: "8px" }}>
                    {/* ❶ درجة الشدة القصوى: لا يوجد دروس ظاهرة أصلاً */}
                    {teacherStats.totVisible === 0 && (
                      <div style={{ background: "#450a0a", borderRight: "5px solid #7f1d1d", padding: "8px 10px", marginBottom: "6px", borderRadius: "4px", color: "#fff", fontSize: "12px", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                        <strong>⚠ لا توجد دروس ظاهرة:</strong> يجب إظهار جميع الدروس بناءً على الخطة الفصلية. المطلوب من المعلم رفع{" "}
                        {toAr(teacherStats.totRequired)} درساً وفق النصاب الأسبوعي ({toAr(termSettings.effectiveWeeks)} أسبوع).
                      </div>
                    )}
                    {teacherStats.totVisible > 0 && teacherStats.lessonsCompletionRate < 100 && (
                      <div style={{ background: "#fee2e2", borderRight: "4px solid #dc2626", padding: "6px 8px", marginBottom: "4px", borderRadius: "4px", color: "#7f1d1d", fontSize: "11px", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                        <strong>✗ الدروس غير مكتملة:</strong> يجب إضافة باقي الدروس وفق الجدول الفصلي.
                        متبقٍ {toAr(teacherStats.totRequired - teacherStats.totVisible)} درس لم يُرفع بعد من أصل {toAr(teacherStats.totRequired)} مطلوب
                        ({teacherStats.lessonsCompletionRate.toFixed(1)}% مكتمل).
                      </div>
                    )}
                    {teacherStats.outcomesRate < 70 && (
                      <div style={{ background: "#fee2e2", borderRight: "4px solid #dc2626", padding: "6px 8px", marginBottom: "4px", borderRadius: "4px", color: "#7f1d1d", fontSize: "11px", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                        <strong>✗ نتاجات التعلم:</strong> ربط الدروس التعليمية بنتاجات التعلم بشكل كامل. نسبة الربط الحالية {pct(teacherStats.outcomesRate)}.
                      </div>
                    )}
                    {teacherStats.asmOutcomesRate < 70 && (
                      <div style={{ background: "#fee2e2", borderRight: "4px solid #dc2626", padding: "6px 8px", marginBottom: "4px", borderRadius: "4px", color: "#7f1d1d", fontSize: "11px", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                        <strong>✗ التقييمات:</strong> إضافة نتاجات التعلم للتقييمات واستيفاء شروط الإسناد. يرجى إسناد التقييم وإظهاره للطلاب. نسبة الاكتمال الحالية {pct(teacherStats.asmOutcomesRate)}.
                      </div>
                    )}
                    {teacherStats.solveRate < 50 && (
                      <div style={{ background: "#fee2e2", borderRight: "4px solid #dc2626", padding: "6px 8px", marginBottom: "4px", borderRadius: "4px", color: "#7f1d1d", fontSize: "11px", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                        <strong>✗ نسبة الحل:</strong> رفع نسبة حل الطلاب للتقييمات. المتوسط الحالي {pct(teacherStats.solveRate)} (المطلوب ≥ 50%).
                      </div>
                    )}
                    {teacherStats.correctionRate < 80 && teacherStats.totAsmCount > 0 && (
                      <div style={{ background: "#fef9c3", borderRight: "4px solid #ca8a04", padding: "6px 8px", marginBottom: "4px", borderRadius: "4px", color: "#713f12", fontSize: "11px", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                        <strong>⚠ التصحيح:</strong> المطلوب رفع نسبة تصحيح التقييمات. النسبة الحالية {pct(teacherStats.correctionRate)}.
                      </div>
                    )}
                    {teacherStats.totVisible > 0 &&
                      teacherStats.lessonsCompletionRate >= 100 &&
                      teacherStats.outcomesRate >= 70 &&
                      teacherStats.solveRate >= 50 && (
                        <div style={{ background: "#dcfce7", borderRight: "4px solid #16a34a", padding: "6px 8px", borderRadius: "4px", color: "#14532d", fontSize: "11px", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                          <strong>✓ أداء جيد!</strong> استمر في المحافظة على مستوى الأداء الجيد ورفع نسبة اكتمال التقييمات.
                        </div>
                      )}
                  </div>
                </div>

                {/* ── بنود المعلم على نظام قطر للتعليم ── */}
                <div
                  className="mb-4 rounded border"
                  dir="rtl"
                  style={{ marginBottom: "12px", border: "1px solid #ddd", borderRadius: "6px", pageBreakInside: "avoid" }}
                >
                  <table className="w-full border-collapse text-sm" dir="rtl" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#166534", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                        <th
                          style={{ border: "1px solid #14532d", padding: "7px 10px", textAlign: "center", color: "#fff", fontWeight: 700, fontSize: "13px", width: "80%" }}
                        >
                          مهام المعلم على نظام قطر للتعليم
                        </th>
                        <th
                          style={{ border: "1px solid #14532d", padding: "7px 10px", textAlign: "center", color: "#fff", fontWeight: 700, fontSize: "13px", width: "20%" }}
                        >
                          البند
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          bnd: "الجدول",
                          desc: "إضافة جدول الحصص الدراسية في بداية كل فصل دراسي وتحديثه باستمرار كلما تغير.",
                          ok: teacherStats.lessonsCompletionRate >= 90,
                        },
                        {
                          bnd: "الدروس",
                          desc: "إظهار الدرس النموذجي وإضافة تاريخ نشره — في حالة عدم توفره يتم إضافة درس بنفس مواصفات الدرس النموذجي فيما عدا أن العرض التقديمي لا يُقسَّم.",
                          ok: teacherStats.outcomesRate >= 70,
                        },
                        {
                          bnd: "التقييمات",
                          desc: "إضافة تاريخ البداية والاستحقاق ثم إسناد التقييم — في حالة عدم توفره يتم إضافة تقييم ختامي يغطي الأهداف واختيار فئته (ختامي) وإضافة نتاجاته.",
                          ok: teacherStats.asmOutcomesRate >= 70 && teacherStats.solveRate >= 50,
                        },
                      ].map((r, i) => {
                        const bg = i % 2 === 0 ? "#f0fdf4" : "#fff";
                        const borderClr = r.ok ? "#16a34a" : "#dc2626";
                        return (
                          <tr key={i} style={{ background: bg, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                            <td style={{ border: "1px solid #e5e7eb", padding: "7px 12px", textAlign: "right", fontSize: "12px", borderRight: `4px solid ${borderClr}` }}>
                              {r.desc}
                            </td>
                            <td style={{ border: "1px solid #e5e7eb", padding: "7px 10px", textAlign: "center", fontWeight: 700, fontSize: "12px", color: "#166534" }}>
                              {r.bnd}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── التواقيع ── */}
                <div
                  className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t pt-4 text-center text-sm"
                  style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", borderTop: "1px solid #ccc", paddingTop: "12px", marginTop: "20px", textAlign: "center" }}
                  dir="rtl"
                >
                  {[
                    { title: "مدير/ة المدرسة", name: termSettings.principalName },
                    { title: "النائب الأكاديمي", name: termSettings.viceNames },
                    { title: "منسق المشاريع الإلكترونية", name: termSettings.coordinatorName },
                  ].map((sig, i) => (
                    <div key={i} style={{ borderTop: "2px solid #9ca3af", paddingTop: "8px", textAlign: "center" }}>
                      <p className="font-bold" style={{ fontWeight: 700 }}>{sig.title}</p>
                      {sig.name && <p className="text-xs mt-1" style={{ fontSize: "11px", marginTop: "4px" }}>{sig.name}</p>}
                      <p className="text-xs text-muted-foreground mt-4" style={{ fontSize: "10px", color: "#888", marginTop: "16px" }}>التوقيع: ________________</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ══════════════════ تبويب النظرة الشاملة ══════════════════ */}
          <TabsContent value="overview">
            <div ref={null} dir="rtl">
              {/* رأس التقرير */}
              <div className="mb-4 rounded-lg overflow-hidden shadow-sm border border-red-200">
                <div className="p-4 text-white text-center" style={{ background: "linear-gradient(135deg,#7f1d1d,#991b1b)" }}>
                  <h2 className="text-xl font-bold">ملخص تقرير نظام قطر للتعليم في الفترة الزمنية</h2>
                  <div className="mt-2 flex justify-center gap-8 text-sm opacity-90">
                    <span>من تاريخ: <strong>{termSettings.filterStart || termSettings.start || "—"}</strong></span>
                    <span>إلى تاريخ: <strong>{termSettings.filterEnd || termSettings.end || "—"}</strong></span>
                    <span>({termSettings.effectiveWeeks} أسبوع فعلي)</span>
                  </div>
                </div>
              </div>

              {/* ── قسم الأقسام + مخطط ── */}
              <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* جدول الأقسام */}
                <div className="rounded-lg border shadow-sm overflow-hidden">
                  <div className="p-3 text-white text-center font-bold" style={{ background: "#7f1d1d" }}>
                    ملخص تقارير الأقسام
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr style={{ background: "#fef2f2" }}>
                          <th className="border-b border-red-200 p-2 text-center text-red-900">#</th>
                          <th className="border-b border-red-200 p-2 text-right text-red-900">القسم</th>
                          <th className="border-b border-red-200 p-2 text-center text-red-900">المعلمون</th>
                          <th className="border-b border-red-200 p-2 text-center text-red-900">اكتمال الدروس</th>
                          <th className="border-b border-red-200 p-2 text-center text-red-900">نسبة المخرجات</th>
                          <th className="border-b border-red-200 p-2 text-center text-red-900">حل التقييمات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allDeptStats.map((d, i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-white hover:bg-red-50" : "bg-red-50 hover:bg-red-100"}>
                            <td className="border-b border-red-100 p-2 text-center text-gray-500">{i + 1}</td>
                            <td className="border-b border-red-100 p-2 text-right font-medium">{d.subjectName}</td>
                            <td className="border-b border-red-100 p-2 text-center">{d.teacherCount}</td>
                            <td className="border-b border-red-100 p-2 text-center">
                              <span className="inline-flex items-center gap-1 font-bold" style={{ color: pctColor(d.completion) }}>
                                {dot(d.completion)} {d.completion.toFixed(1)}%
                              </span>
                            </td>
                            <td className="border-b border-red-100 p-2 text-center">
                              <span className="inline-flex items-center gap-1" style={{ color: pctColor(d.outcomesRatio) }}>
                                {dot(d.outcomesRatio)} {d.outcomesRatio.toFixed(1)}%
                              </span>
                            </td>
                            <td className="border-b border-red-100 p-2 text-center">
                              <span className="inline-flex items-center gap-1" style={{ color: pctColor(d.solveRate) }}>
                                {dot(d.solveRate)} {d.solveRate.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* مخطط الأقسام */}
                <div className="rounded-lg border shadow-sm overflow-hidden">
                  <div className="p-3 text-white text-center font-bold" style={{ background: "#7f1d1d" }}>
                    نسبة اكتمال الدروس بالأقسام
                  </div>
                  <div className="p-4">
                    <CSSBarChart
                      data={allDeptStats.map((d) => ({
                        label: d.subjectName,
                        value: parseFloat(d.completion.toFixed(1)),
                        color: d.completion >= 90 ? "#16a34a" : d.completion >= 70 ? "#ca8a04" : "#dc2626",
                      }))}
                      showPercent
                      unit="%"
                      maxRows={15}
                    />
                  </div>
                </div>
              </div>

              {/* ── جدول الصفوف ── */}
              <div className="rounded-lg border shadow-sm overflow-hidden mb-4">
                <div className="p-3 text-white text-center font-bold" style={{ background: "#7f1d1d" }}>
                  ملخص تقارير الصفوف والشعب
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr style={{ background: "#fef2f2" }}>
                        <th className="border-b border-red-200 p-2 text-center text-red-900">#</th>
                        <th className="border-b border-red-200 p-2 text-center text-red-900">الصف</th>
                        <th className="border-b border-red-200 p-2 text-center text-red-900">الشعبة</th>
                        <th className="border-b border-red-200 p-2 text-center text-red-900">الدروس الظاهرة</th>
                        <th className="border-b border-red-200 p-2 text-center text-red-900">المطلوب</th>
                        <th className="border-b border-red-200 p-2 text-center text-red-900">اكتمال الدروس</th>
                        <th className="border-b border-red-200 p-2 text-center text-red-900">حل التقييمات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allGradeStats.map((g, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-red-50"}>
                          <td className="border-b border-red-100 p-2 text-center text-gray-500">{i + 1}</td>
                          <td className="border-b border-red-100 p-2 text-center font-bold">{g.grade}</td>
                          <td className="border-b border-red-100 p-2 text-center">{g.section}</td>
                          <td className="border-b border-red-100 p-2 text-center">{g.visible}</td>
                          <td className="border-b border-red-100 p-2 text-center">{g.required > 0 ? g.required : "—"}</td>
                          <td className="border-b border-red-100 p-2 text-center">
                            <span style={{ color: pctColor(g.completion), fontWeight: 700 }}>
                              {dot(g.completion)} {g.completion.toFixed(1)}%
                            </span>
                          </td>
                          <td className="border-b border-red-100 p-2 text-center">
                            <span style={{ color: pctColor(g.solveRate) }}>
                              {g.solveRate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* زر الطباعة */}
              <div className="flex gap-2 mb-2">
                <Button onClick={handlePrint} className="gap-2" size="sm">
                  <Printer className="h-4 w-4" /> طباعة النظرة الشاملة
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ══════════════════ تبويب تقرير القسم ══════════════════ */}
          <TabsContent value="dept">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3 mb-4" dir="rtl"
              style={{ borderRight: `4px solid #0891b2` }}>
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-52">
                  <label className="mb-1 block text-xs font-semibold text-slate-500">اختر القسم (المادة)</label>
                  <Select value={selectedDept} onValueChange={setSelectedDept}>
                    <SelectTrigger className="rounded-lg border-slate-300">
                      <SelectValue placeholder="-- اختر القسم --" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 overflow-y-auto">
                      {departments.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedDept && deptStats.teachers.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={handlePrint} className="gap-2" size="sm"
                      style={{ background: MAROON, color: "#fff" }}>
                      <Printer className="h-4 w-4" /> طباعة ملخص القسم
                    </Button>
                    <Button
                      onClick={handlePrintDeptExpanded}
                      variant="outline"
                      className="gap-2 border-blue-600 text-blue-700 hover:bg-blue-50"
                      size="sm"
                    >
                      <Printer className="h-4 w-4" /> طباعة موسعة (مع تفاصيل المعلمين)
                    </Button>
                    <Button
                      onClick={downloadAllDeptReportsSeparate}
                      disabled={zipLoading}
                      variant="outline"
                      className="gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                      size="sm"
                    >
                      {zipLoading
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> جاري التحميل... ({zipProgress.current}/{zipProgress.total})</>
                        : <><Download className="h-4 w-4" /> تحميل كل التقارير (PDF)</>
                      }
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {selectedDept && deptStats.teachers.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">لا توجد بيانات لهذا القسم</div>
            )}

            {selectedDept && deptStats.teachers.length > 0 && (
              <div ref={printRef}>
                {/* ── عنوان التقرير ── */}
                <div style={{
                  background: "#7f1d1d", color: "#ffffff", textAlign: "center",
                  padding: "10px 16px", borderRadius: "6px", marginBottom: "12px",
                  fontSize: "16px", fontWeight: 700,
                  WebkitPrintColorAdjust: "exact", printColorAdjust: "exact",
                }}>
                  تقرير أداء قسم: {selectedDept}
                </div>

                {/* ── بطاقات الملخص ── */}
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px",
                  marginBottom: "14px", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact",
                }}>
                  {[
                    { lbl: "عدد المعلمين", val: deptStats.totals.teachers, unit: "معلم", plain: true },
                    { lbl: "نسبة اكتمال الدروس", val: deptStats.totals.completion },
                    { lbl: "نسبة الدروس بالمخرجات", val: deptStats.totals.outcomesRatio },
                    {
                      lbl: "الدروس الظاهرة / المطلوبة",
                      val: deptStats.totals.visible,
                      extra: `/ ${toAr(deptStats.totals.required)}`, plain: true
                    },
                  ].map((s, i) => (
                    <div key={i} style={{
                      border: `2px solid ${s.plain ? "#9ca3af" : pctColor(s.val)}`,
                      borderRadius: "8px", padding: "10px 8px", textAlign: "center",
                      background: "#fff", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact",
                    }}>
                      <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>{s.lbl}</p>
                      {s.plain ? (
                        <p style={{ fontSize: "22px", fontWeight: 700, color: "#1d4ed8" }}>
                          {toAr(s.val)}{s.unit ? ` ${s.unit}` : ""}{s.extra || ""}
                        </p>
                      ) : (
                        <p style={{ fontSize: "22px", fontWeight: 700, color: pctColor(s.val) }}>
                          {dot(s.val)} {s.val.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* ── جدول المعلمين ── */}
                <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm" dir="rtl">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }} dir="rtl">
                    <thead>
                      <tr style={{
                        background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
                        color: "#ffffff",
                        WebkitPrintColorAdjust: "exact", printColorAdjust: "exact",
                      }}>
                        {[
                          { label: "#", w: "36px" },
                          { label: "اسم المعلم", w: "180px", align: "right" },
                          { label: "المدرسة", w: "130px", align: "right" },
                          { label: "الشعب", w: "160px" },
                          { label: "عدد\nالشعب", w: "55px" },
                          { label: "المطلوب", w: "60px" },
                          { label: "الظاهرة", w: "60px" },
                          { label: "المخفية", w: "60px" },
                          { label: "بمخرجات", w: "65px" },
                          { label: "بملاحظات", w: "65px" },
                          { label: "اكتمال\nالدروس", w: "80px" },
                          { label: "نسبة\nالمخرجات", w: "80px" },
                        ].map((h, i) => (
                          <th key={i} style={{
                            border: "1px solid rgba(255,255,255,0.2)",
                            padding: "10px 6px",
                            textAlign: h.align || "center",
                            width: h.w,
                            whiteSpace: "pre-line",
                            lineHeight: "1.3",
                            fontWeight: 700,
                            fontSize: "11px",
                          }}>{h.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {deptStats.teachers.map((t, i) => {
                        const hidden = t.total - t.visible;
                        const rowBg = i % 2 === 0 ? "#ffffff" : "#fdf2f2";
                        const hiddenBg = hidden > 0 ? "rgba(239,68,68,0.08)" : "transparent";
                        return (
                          <tr
                            key={i}
                            style={{ background: rowBg, cursor: "pointer", transition: "background 0.15s" }}
                            title="انقر لعرض تقرير المعلم الفردي"
                            onClick={() => { setSelectedTeacher(t.teacherName); setCameFromDept(true); setActiveTab("teacher"); }}
                            onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                            onMouseLeave={e => e.currentTarget.style.background = rowBg}
                          >
                            {/* رقم */}
                            <td style={{ border: "1px solid #f3f4f6", padding: "8px 4px", textAlign: "center", color: "#9ca3af", fontWeight: 600 }}>{i + 1}</td>

                            {/* اسم المعلم + حالة الاكتمال */}
                            <td style={{ border: "1px solid #f3f4f6", padding: "8px 10px", textAlign: "right" }}>
                              <span style={{ color: "#1d4ed8", fontWeight: 700, fontSize: "12px" }}>{t.teacherName}</span>
                              <span style={{ display: "block", fontSize: "9px", color: "#9ca3af", marginTop: "2px" }}>انقر للتفاصيل ←</span>
                              {t.required > 0 && (() => {
                                const rem = t.required - t.visible;
                                const isComplete = rem <= 0;
                                return (
                                  <span style={{
                                    display: "inline-block", marginTop: "4px",
                                    background: isComplete ? "#dcfce7" : t.completion >= 70 ? "#fef9c3" : "#fee2e2",
                                    color: isComplete ? "#166534" : t.completion >= 70 ? "#854d0e" : "#991b1b",
                                    border: `1px solid ${isComplete ? "#86efac" : t.completion >= 70 ? "#fde047" : "#fca5a5"}`,
                                    borderRadius: "999px", padding: "1px 7px", fontSize: "10px", fontWeight: 700,
                                  }}>
                                    {isComplete ? "✓ مكتمل" : `متبقي ${toAr(Math.abs(rem))} درس`}
                                  </span>
                                );
                              })()}
                            </td>

                            {/* المدرسة */}
                            <td style={{ border: "1px solid #f3f4f6", padding: "8px 8px", textAlign: "right", color: "#6b7280", fontSize: "10px" }}>{t.schoolName}</td>

                            {/* الشعب — badges */}
                            <td style={{ border: "1px solid #f3f4f6", padding: "6px 6px", textAlign: "right" }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", justifyContent: "flex-end" }}>
                                {t.sections.map((sec, si) => (
                                  <span key={si} style={{
                                    background: "#eff6ff", color: "#1d4ed8",
                                    border: "1px solid #bfdbfe",
                                    borderRadius: "12px", padding: "2px 7px",
                                    fontSize: "10px", fontWeight: 600, whiteSpace: "nowrap",
                                  }}>{sec}</span>
                                ))}
                              </div>
                            </td>

                            {/* عدد الشعب */}
                            <td style={{ border: "1px solid #f3f4f6", padding: "8px 4px", textAlign: "center" }}>
                              <span style={{ background: "#f0f9ff", color: "#0369a1", borderRadius: "999px", padding: "2px 8px", fontWeight: 700, fontSize: "12px" }}>{toAr(t.classes)}</span>
                            </td>

                            {/* المطلوب */}
                            <td style={{ border: "1px solid #f3f4f6", padding: "8px 4px", textAlign: "center", color: "#374151", fontWeight: 600 }}>
                              {t.required > 0 ? toAr(t.required) : <span style={{ color: "#d1d5db" }}>—</span>}
                            </td>

                            {/* الظاهرة */}
                            <td style={{ border: "1px solid #f3f4f6", padding: "8px 4px", textAlign: "center" }}>
                              <span style={{ background: "#f0fdf4", color: "#166534", borderRadius: "6px", padding: "3px 8px", fontWeight: 700, fontSize: "12px" }}>{toAr(t.visible)}</span>
                            </td>

                            {/* المخفية — ملونة لو فيها نقص */}
                            <td style={{ border: "1px solid #f3f4f6", padding: "8px 4px", textAlign: "center", background: hiddenBg }}>
                              {hidden > 0 ? (
                                <span style={{ background: "#fef2f2", color: "#dc2626", borderRadius: "6px", padding: "3px 8px", fontWeight: 700, fontSize: "12px", border: "1px solid #fecaca" }}>
                                  {toAr(hidden)}
                                </span>
                              ) : (
                                <span style={{ color: "#16a34a", fontWeight: 700 }}>✓</span>
                              )}
                            </td>

                            {/* بمخرجات */}
                            <td style={{ border: "1px solid #f3f4f6", padding: "8px 4px", textAlign: "center", color: "#374151" }}>{toAr(t.outcomes)}</td>

                            {/* بملاحظات */}
                            <td style={{ border: "1px solid #f3f4f6", padding: "8px 4px", textAlign: "center", color: "#374151" }}>{toAr(t.notes)}</td>

                            {/* اكتمال الدروس */}
                            <td style={{ border: "1px solid #f3f4f6", padding: "8px 4px", textAlign: "center" }}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                                <span style={{ color: pctColor(t.completion), fontWeight: 700, fontSize: "12px" }}>
                                  {dot(t.completion)} {t.completion.toFixed(1)}%
                                </span>
                                <div style={{ width: "50px", height: "4px", background: "#e5e7eb", borderRadius: "9999px", overflow: "hidden" }}>
                                  <div style={{ width: `${t.completion}%`, height: "100%", background: pctColor(t.completion), borderRadius: "9999px", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} />
                                </div>
                              </div>
                            </td>

                            {/* نسبة المخرجات */}
                            <td style={{ border: "1px solid #f3f4f6", padding: "8px 4px", textAlign: "center" }}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                                <span style={{ color: pctColor(t.outcomesRatio), fontWeight: 700, fontSize: "12px" }}>
                                  {dot(t.outcomesRatio)} {t.outcomesRatio.toFixed(1)}%
                                </span>
                                <div style={{ width: "50px", height: "4px", background: "#e5e7eb", borderRadius: "9999px", overflow: "hidden" }}>
                                  <div style={{ width: `${t.outcomesRatio}%`, height: "100%", background: pctColor(t.outcomesRatio), borderRadius: "9999px", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* ── صف الإجماليات ── */}
                      <tr style={{ background: "linear-gradient(135deg,#fef2f2,#fff5f5)", fontWeight: 700, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact", borderTop: "2px solid #fca5a5" }}>
                        <td style={{ border: "1px solid #fecaca", padding: "10px 8px", textAlign: "right", color: "#7f1d1d", fontWeight: 800, fontSize: "13px" }} colSpan={4}>الإجمالي</td>
                        <td style={{ border: "1px solid #fecaca", padding: "10px 4px", textAlign: "center" }}>
                          <span style={{ background: "#f0f9ff", color: "#0369a1", borderRadius: "999px", padding: "2px 8px", fontWeight: 700 }}>{toAr(deptStats.totals.teachers)}</span>
                        </td>
                        <td style={{ border: "1px solid #fecaca", padding: "10px 4px", textAlign: "center", fontWeight: 700 }}>{deptStats.totals.required > 0 ? toAr(deptStats.totals.required) : "—"}</td>
                        <td style={{ border: "1px solid #fecaca", padding: "10px 4px", textAlign: "center" }}>
                          <span style={{ background: "#f0fdf4", color: "#166534", borderRadius: "6px", padding: "3px 8px", fontWeight: 700 }}>{toAr(deptStats.totals.visible)}</span>
                        </td>
                        <td style={{ border: "1px solid #fecaca", padding: "10px 4px", textAlign: "center" }}>
                          {deptStats.totals.total - deptStats.totals.visible > 0 ? (
                            <span style={{ background: "#fef2f2", color: "#dc2626", borderRadius: "6px", padding: "3px 8px", fontWeight: 700, border: "1px solid #fecaca" }}>
                              {toAr(deptStats.totals.total - deptStats.totals.visible)}
                            </span>
                          ) : <span style={{ color: "#16a34a" }}>✓</span>}
                        </td>
                        <td style={{ border: "1px solid #fecaca", padding: "10px 4px", textAlign: "center", fontWeight: 700 }}>{toAr(deptStats.totals.outcomes)}</td>
                        <td style={{ border: "1px solid #fecaca", padding: "10px 4px", textAlign: "center", color: "#6b7280" }}>—</td>
                        <td style={{ border: "1px solid #fecaca", padding: "10px 4px", textAlign: "center" }}>
                          <span style={{ color: pctColor(deptStats.totals.completion), fontWeight: 800, fontSize: "13px" }}>
                            {dot(deptStats.totals.completion)} {deptStats.totals.completion.toFixed(1)}%
                          </span>
                        </td>
                        <td style={{ border: "1px solid #fecaca", padding: "10px 4px", textAlign: "center" }}>
                          <span style={{ color: pctColor(deptStats.totals.outcomesRatio), fontWeight: 800, fontSize: "13px" }}>
                            {dot(deptStats.totals.outcomesRatio)} {deptStats.totals.outcomesRatio.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ── التواقيع ── */}
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px",
                  borderTop: "1px solid #d1d5db", paddingTop: "14px", marginTop: "20px",
                  textAlign: "center", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact",
                }} dir="rtl">
                  {[
                    { title: "مدير/ة المدرسة", name: termSettings.principalName },
                    { title: "النائب الأكاديمي", name: termSettings.viceNames },
                    { title: "منسق المشاريع الإلكترونية", name: termSettings.coordinatorName },
                  ].map((sig, i) => (
                    <div key={i} style={{ borderTop: "2px solid #9ca3af", paddingTop: "8px", textAlign: "center" }}>
                      <p style={{ fontWeight: 700, fontSize: "13px" }}>{sig.title}</p>
                      {sig.name && <p style={{ fontSize: "12px", marginTop: "4px", color: "#374151" }}>{sig.name}</p>}
                      <p style={{ fontSize: "10px", color: "#9ca3af", marginTop: "16px" }}>التوقيع: ________________</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default ReportsPage;
