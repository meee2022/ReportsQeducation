// هذه الصفحة تعرض بيانات المدرسة الحالية فقط بناءً على currentSchoolId
import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  GraduationCap,
  Filter,
  BookOpen,
  Clock,
  TrendingUp,
  Award,
  Loader2,
  Calendar,
} from "lucide-react";
import { AppLayout } from "@/components/layout";
import { StatCard, EmptyState } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CSSBarChart } from "@/components/charts/CSSBarChart";
import { useCurrentSchool } from "@/utils/useCurrentSchool";

const toMinutesLabel = (minutes) => `${Number(minutes || 0)} دقيقة`;

const formatDateTime = (ts) => {
  if (!ts) return "غير متوفر";
  try {
    const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(ts);
  }
};

const getDaysSince = (lastDate) => {
  if (!lastDate) return "-";
  try {
    const last =
      typeof lastDate === "number" ? new Date(lastDate) : new Date(lastDate);
    const now = new Date();
    const diffTime = Math.abs(now - last);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "اليوم";
    if (diffDays === 1) return "أمس";
    return `${diffDays} يوم`;
  } catch {
    return "-";
  }
};

// دالة لاستخراج نوع المتصفح من userAgent بشكل مبسط
const getBrowserName = (ua) => {
  if (!ua) return "غير معروف";
  if (ua.includes("Chrome") && !ua.includes("Edge")) return "Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edge")) return "Edge";
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
  return "غير معروف";
};

const StudentsPage = () => {
  const [courseFilter, setCourseFilter] = useState("all");

  const { schoolId } = useCurrentSchool();

  // جلب بيانات التفاعل من Convex
  const studentInteractionsData = useQuery(api.studentInteractions.list, { schoolId });
  const raw = useMemo(() => studentInteractionsData || [], [studentInteractionsData]);

  // تجميع الطلاب (صف واحد لكل طالب)
  const studentsAggregated = useMemo(() => {
    const map = new Map();
    raw.forEach((r) => {
      const firstName = (r.firstName || "").trim();
      const lastName = (r.lastName || "").trim();
      const studentName = `${firstName} ${lastName}`.trim() || "بدون اسم";
      const lmsId = r.lmsId;
      const key = `${lmsId}||${studentName}`;

      if (!map.has(key)) {
        map.set(key, {
          lmsId,
          studentName,
          courses: new Set(),
          totalTime: 0,
          interactions: 0,
          lastAccessTime: r._creationTime,
          lastUserAgent: r.userAgent || "",
        });
      }
      const student = map.get(key);
      student.totalTime += Number(r.totalTime || 0);
      student.interactions += 1;
      if (r.courseName) student.courses.add(r.courseName);
      // تحديث آخر دخول (أكبر تاريخ)
      if (r._creationTime > student.lastAccessTime) {
        student.lastAccessTime = r._creationTime;
        student.lastUserAgent = r.userAgent || "";
      }
    });

    return Array.from(map.values()).map((s) => ({
      ...s,
      coursesArray: Array.from(s.courses),
      coursesText: Array.from(s.courses).join("، ") || "-",
      browser: getBrowserName(s.lastUserAgent),
    }));
  }, [raw]);

  // فلترة حسب المادة
  const courses = useMemo(
    () => [
      ...new Set(
        raw
          .map((r) => r.courseName)
          .filter(Boolean)
      ),
    ],
    [raw]
  );

  const filteredStudents = useMemo(() => {
    if (courseFilter === "all") return studentsAggregated;
    return studentsAggregated.filter((s) =>
      s.coursesArray.includes(courseFilter)
    );
  }, [studentsAggregated, courseFilter]);

  // إحصائيات
  const stats = useMemo(() => {
    if (filteredStudents.length === 0) {
      return {
        totalStudents: 0,
        totalInteractions: 0,
        totalTime: 0,
        avgTime: 0,
      };
    }
    const totalStudents = filteredStudents.length;
    const totalInteractions = filteredStudents.reduce(
      (sum, s) => sum + s.interactions,
      0
    );
    const totalTime = filteredStudents.reduce(
      (sum, s) => sum + s.totalTime,
      0
    );
    const avgTime = Math.round(totalTime / totalStudents);
    return { totalStudents, totalInteractions, totalTime, avgTime };
  }, [filteredStudents]);

  // أعلى الطلاب تفاعلاً
  const topStudents = useMemo(
    () =>
      [...filteredStudents]
        .sort((a, b) => b.totalTime - a.totalTime)
        .slice(0, 10)
        .map((s) => ({
          ...s,
          shortName:
            s.studentName.length > 18
              ? s.studentName.slice(0, 16) + "..."
              : s.studentName,
        })),
    [filteredStudents]
  );

  // حالة التحميل
  if (studentInteractionsData === undefined) {
    return (
      <AppLayout title="تفاعل الطلاب">
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">
              جاري تحميل بيانات التفاعل...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="تفاعل الطلاب">
      <div className="space-y-6" dir="rtl">
        {/* العنوان */}
        <div className="mb-2 text-right">
          <h1 className="text-2xl font-bold text-foreground">تفاعل الطلاب</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ملخص تفاعل الطلاب على المنصة - مجمّع حسب الطالب
          </p>
        </div>

        {/* البطاقات */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="عدد الطلاب"
            value={stats.totalStudents}
            icon={GraduationCap}
            variant="primary"
          />
          <StatCard
            title="إجمالي التفاعلات"
            value={stats.totalInteractions}
            icon={BookOpen}
            variant="info"
          />
          <StatCard
            title="متوسط وقت التفاعل"
            value={toMinutesLabel(stats.avgTime)}
            icon={Clock}
            variant="success"
          />
          <StatCard
            title="إجمالي وقت التفاعل"
            value={toMinutesLabel(stats.totalTime)}
            icon={TrendingUp}
            variant="warning"
          />
        </div>

        {/* أعلى الطلاب تفاعلاً */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              أعلى الطلاب تفاعلاً (حسب إجمالي الوقت)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topStudents.length > 0 ? (
              <CSSBarChart
                data={topStudents.map((s) => ({
                  label: s.studentName,
                  value: Number(s.totalTime || 0),
                  color: "hsl(345, 65%, 35%)",
                }))}
                formatValue={(v) => `${v} دقيقة`}
                maxRows={10}
              />
            ) : (
              <EmptyState
                title="لا توجد بيانات"
                description="لم يتم العثور على بيانات تفاعل كافية لعرض الرسم"
              />
            )}
          </CardContent>
        </Card>

        {/* الفلاتر */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">تصفية:</span>
              </div>

              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="المادة / المقرر" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المواد</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* جدول تفاعل الطلاب (مجمّع) */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              جدول تفاعل الطلاب (مجمّع)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredStudents.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border bg-card">
                <Table className="[&_*]:text-right text-sm">
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead className="w-28">LMS ID</TableHead>
                      <TableHead className="w-52">اسم الطالب</TableHead>
                      <TableHead className="w-72">المقررات</TableHead>
                      <TableHead className="w-32">عدد التفاعلات</TableHead>
                      <TableHead className="w-32">إجمالي الوقت</TableHead>
                      <TableHead className="w-44">آخر دخول</TableHead>
                      <TableHead className="w-28">منذ</TableHead>
                      <TableHead className="w-32">المتصفح</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.slice(0, 200).map((s, idx) => (
                      <TableRow
                        key={s.lmsId + s.studentName}
                        className={idx % 2 === 0 ? "bg-background" : "bg-muted/10"}
                      >
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {s.lmsId}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {s.studentName}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {s.coursesArray.slice(0, 3).map((c, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-xs bg-blue-50 border-blue-200"
                              >
                                {c}
                              </Badge>
                            ))}
                            {s.coursesArray.length > 3 && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-slate-50 border-slate-300"
                              >
                                +{s.coursesArray.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-purple-50 border-purple-200">
                            {s.interactions}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold"
                          >
                            {toMinutesLabel(s.totalTime)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime(s.lastAccessTime)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-xs bg-orange-50 border-orange-200 text-orange-700"
                          >
                            {getDaysSince(s.lastAccessTime)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {s.browser}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                title="لا توجد بيانات طلاب"
                description="يرجى رفع ملف تفاعل الطلاب أو تعديل الفلاتر"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default StudentsPage;
