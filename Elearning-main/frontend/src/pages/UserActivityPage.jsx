// هذه الصفحة تعرض بيانات المدرسة الحالية فقط بناءً على currentSchoolId
import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Activity,
  Filter,
  User,
  Clock,
  School,
  Loader2,
  Users,
  BookOpen,
  UserCheck,
  Shield,
  HeartHandshake,
  Baby,
  BarChart3,
} from "lucide-react";
import { AppLayout } from "@/components/layout";
import { EmptyState } from "@/components/common";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { CSSDonutChart } from "@/components/charts/CSSDonutChart";
import { CSSBarChart } from "@/components/charts/CSSBarChart";
import { useCurrentSchool } from "@/utils/useCurrentSchool";

const UserActivityPage = () => {
  const [roleFilter, setRoleFilter] = useState("all");
  const [schoolFilter, setSchoolFilter] = useState("all");

  const { schoolId, schoolName: currentSchoolName } = useCurrentSchool();

  const userActivityData = useQuery(api.userActivity.list, { schoolId });
  const studentInteractionsData = useQuery(api.studentInteractions.list, { schoolId });

  const userActivity = useMemo(() => userActivityData || [], [userActivityData]);
  const studentInteractions = useMemo(() => studentInteractionsData || [], [studentInteractionsData]);

  /* مدارس فريدة */
  const schools = useMemo(() => {
    return [
      ...new Set(
        userActivity
          .map((u) => (u.schoolName || "").trim())
          .filter(Boolean)
      ),
    ];
  }, [userActivity]);

  /* دالة مساعدة للأعلام المنطقية - تدعم 1/0/نعم/لا/true/false */
  const isTrue = (v) => {
    if (v === true || v === 1) return true;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      return s === "1" || s === "true" || s === "yes" || s === "نعم";
    }
    return false;
  };

  /* تسمية الدور */
  const getRoleLabel = (user) => {
    if (isTrue(user.isManager)) return "مدير";
    if (isTrue(user.isLmsCoordinator)) return "منسق LMS";
    if (isTrue(user.isCounselor)) return "مرشد";
    if (isTrue(user.isTeacher)) return "معلم";
    if (isTrue(user.isStudent)) return "طالب";
    if (isTrue(user.isParent)) return "ولي أمر";
    return "غير محدد";
  };

  /* شكل Badge حسب الدور */
  const getRoleBadgeVariant = (user) => {
    if (isTrue(user.isManager)) return "destructive";
    if (isTrue(user.isLmsCoordinator)) return "default";
    if (isTrue(user.isCounselor)) return "secondary";
    if (isTrue(user.isTeacher)) return "default";
    if (isTrue(user.isStudent)) return "secondary";
    if (isTrue(user.isParent)) return "outline";
    return "outline";
  };

  /* تصفية المستخدمين */
  const filteredUsers = useMemo(() => {
    return userActivity
      .filter((u) => {
        if (roleFilter === "all") return true;
        if (roleFilter === "teacher") return isTrue(u.isTeacher);
        if (roleFilter === "student") return isTrue(u.isStudent);
        if (roleFilter === "parent") return isTrue(u.isParent);
        if (roleFilter === "manager") return isTrue(u.isManager);
        if (roleFilter === "counselor") return isTrue(u.isCounselor);
        if (roleFilter === "coordinator")
          return isTrue(u.isLmsCoordinator);
        return true;
      })
      .filter(
        (u) =>
          schoolFilter === "all" ||
          (u.schoolName || "").trim() === schoolFilter
      );
  }, [userActivity, roleFilter, schoolFilter]);

  /* توزيع الأدوار (إجمالي) */
  const roleDistribution = useMemo(() => {
    const teachers = userActivity.filter((u) =>
      isTrue(u.isTeacher)
    ).length;
    const students = userActivity.filter((u) =>
      isTrue(u.isStudent)
    ).length;
    const parents = userActivity.filter((u) =>
      isTrue(u.isParent)
    ).length;
    return [
      {
        name: "معلم",
        value: teachers,
        color: "hsl(345, 65%, 35%)",
      },
      {
        name: "طالب",
        value: students,
        color: "hsl(220, 70%, 45%)",
      },
      {
        name: "ولي أمر",
        value: parents,
        color: "hsl(145, 55%, 35%)",
      },
    ].filter((item) => item.value > 0);
  }, [userActivity]);

  /* عدّاد الأدوار التفصيلي */
  const roleCounts = useMemo(() => {
    const teachers = userActivity.filter(
      (u) =>
        isTrue(u.isTeacher) &&
        !isTrue(u.isManager) &&
        !isTrue(u.isLmsCoordinator) &&
        !isTrue(u.isCounselor)
    ).length;
    const students = userActivity.filter((u) =>
      isTrue(u.isStudent)
    ).length;
    const parents = userActivity.filter((u) =>
      isTrue(u.isParent)
    ).length;
    const managers = userActivity.filter((u) =>
      isTrue(u.isManager)
    ).length;
    const counselors = userActivity.filter((u) =>
      isTrue(u.isCounselor)
    ).length;
    const coordinators = userActivity.filter((u) =>
      isTrue(u.isLmsCoordinator)
    ).length;
    return {
      teachers,
      students,
      parents,
      managers,
      counselors,
      coordinators,
    };
  }, [userActivity]);

  /* تفاعلات حسب النوع */
  const interactionsByType = useMemo(() => {
    const aggregated = {};
    studentInteractions.forEach((interaction) => {
      const type = interaction.sectionType || "Other";
      aggregated[type] =
        (aggregated[type] || 0) +
        (interaction.totalTime || 0);
    });
    return Object.entries(aggregated).map(([name, value]) => ({
      name:
        name === "Assignment"
          ? "واجب"
          : name === "Section"
            ? "قسم"
            : name === "Quiz"
              ? "اختبار"
              : name === "Video"
                ? "فيديو"
                : name,
      value,
    }));
  }, [studentInteractions]);

  /* تفاعلات حسب الطالب */
  const interactionsByStudent = useMemo(() => {
    const UA_PATTERN = /Safari|Chrome|Firefox|Gecko|Mobile|AppleWebKit/i;
    const aggregated = {};
    studentInteractions.forEach((interaction) => {
      const studentName = `${interaction.firstName || ""} ${interaction.lastName || ""
        }`.trim();
      if (!studentName) return;

      // استخدم اسم المدرسة من الإعدادات إذا كان المخزون يشبه UserAgent
      const rawSchool = (interaction.schoolName || "").trim();
      const resolvedSchool = (!rawSchool || UA_PATTERN.test(rawSchool))
        ? (currentSchoolName || "")
        : rawSchool;

      if (!aggregated[studentName]) {
        aggregated[studentName] = {
          studentName,
          schoolName: resolvedSchool,
          courses: {},
          totalTime: 0,
        };
      }
      aggregated[studentName].totalTime +=
        interaction.totalTime || 0;
      const courseName =
        interaction.courseName || "غير محدد";
      aggregated[studentName].courses[courseName] =
        (aggregated[studentName].courses[courseName] || 0) +
        (interaction.totalTime || 0);
    });
    return Object.values(aggregated).sort((a, b) => b.totalTime - a.totalTime);
  }, [studentInteractions, currentSchoolName]);

  /* صيغة "منذ ..." */
  const formatTimeAgo = (dateString) => {
    if (!dateString) return "غير متوفر";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      return `منذ ${diffDays} يوم`;
    } catch {
      return "غير متوفر";
    }
  };

  const totalInteractionTime = studentInteractions.reduce(
    (sum, i) => sum + (i.totalTime || 0),
    0
  );

  /* حالة التحميل */
  if (
    userActivityData === undefined ||
    studentInteractionsData === undefined
  ) {
    return (
      <AppLayout title="نشاط المستخدمين">
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">
              جاري تحميل البيانات...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  /* ألوان بطاقات الأدوار ثابتة ومميزة */
  const roleCards = [
    {
      label: "معلم",
      count: roleCounts.teachers,
      icon: BookOpen,
      bg: "#7f1d1d",
      light: "#fef2f2",
    },
    {
      label: "طالب",
      count: roleCounts.students,
      icon: Baby,
      bg: "#1d4ed8",
      light: "#eff6ff",
    },
    {
      label: "ولي أمر",
      count: roleCounts.parents,
      icon: HeartHandshake,
      bg: "#15803d",
      light: "#f0fdf4",
    },
    {
      label: "مدير",
      count: roleCounts.managers,
      icon: Shield,
      bg: "#b45309",
      light: "#fffbeb",
    },
    {
      label: "مرشد",
      count: roleCounts.counselors,
      icon: UserCheck,
      bg: "#7e22ce",
      light: "#faf5ff",
    },
    {
      label: "منسق LMS",
      count: roleCounts.coordinators,
      icon: Users,
      bg: "#0f766e",
      light: "#f0fdfa",
    },
  ];

  return (
    <AppLayout title="نشاط المستخدمين">
      <div className="space-y-6" dir="rtl">

        {/* ── العنوان ── */}
        <div className="mb-2 text-right">
          <h1 className="text-2xl font-bold text-foreground">
            لوحة متابعة نشاط المستخدمين
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            متابعة نشاط المستخدمين وتحليل تفاعل الطلاب مع المحتوى التعليمي
          </p>
        </div>

        {/* ── بطاقات الإحصائيات السريعة (StatCard) ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="إجمالي المستخدمين"
            value={userActivity.length.toLocaleString("en-US")}
            icon={<User />}
            accent="#4338ca"
          />
          <StatCard
            label="إجمالي التفاعلات"
            value={studentInteractions.length.toLocaleString("en-US")}
            icon={<Activity />}
            accent="#16a34a"
          />
          <StatCard
            label="إجمالي وقت التفاعل"
            value={`${totalInteractionTime.toLocaleString("en-US")} د`}
            icon={<Clock />}
            accent="#0369a1"
          />
          <StatCard
            label="عدد المدارس"
            value={schools.length.toLocaleString("en-US")}
            icon={<School />}
            accent="#b45309"
          />
        </div>

        {/* ── بطاقات الأدوار ── */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {roleCards.map((r, i) => (
            <div
              key={i}
              className="rounded-xl border shadow-sm p-4"
              style={{ background: r.light, borderRight: `4px solid ${r.bg}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="rounded-lg p-2" style={{ background: r.bg + "20" }}>
                  <r.icon className="h-5 w-5" style={{ color: r.bg }} />
                </div>
                <span className="text-3xl font-bold" style={{ color: r.bg }}>
                  {r.count}
                </span>
              </div>
              <p className="text-sm font-semibold" style={{ color: r.bg }}>{r.label}</p>
              <div className="mt-2 h-1.5 rounded-full" style={{ background: r.bg + "20" }}>
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    background: r.bg,
                    width: userActivity.length > 0
                      ? `${Math.min(100, (r.count / userActivity.length) * 100)}%`
                      : "0%",
                  }}
                />
              </div>
              <p className="mt-1 text-xs" style={{ color: r.bg + "aa" }}>
                {userActivity.length > 0
                  ? ((r.count / userActivity.length) * 100).toFixed(1)
                  : 0}% من الإجمالي
              </p>
            </div>
          ))}
        </div>

        {/* ── الرسوم البيانية ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* توزيع المستخدمين حسب الدور */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                توزيع المستخدمين حسب الدور
              </CardTitle>
            </CardHeader>
            <CardContent>
              {roleDistribution.length > 0 ? (
                <CSSDonutChart
                  data={roleDistribution.map((d) => ({
                    label: d.name,
                    value: d.value,
                    color: d.color,
                  }))}
                  size={200}
                  thick={36}
                  center={
                    <div className="text-center">
                      <p className="text-lg font-extrabold text-slate-800">
                        {userActivity.length.toLocaleString("en-US")}
                      </p>
                      <p className="text-[10px] text-slate-500">مستخدم</p>
                    </div>
                  }
                />
              ) : (
                <EmptyState
                  title="لا توجد بيانات"
                  description="يرجى رفع ملف نشاط المستخدمين أولاً"
                />
              )}
            </CardContent>
          </Card>

          {/* توزيع التفاعلات حسب النوع */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                توزيع التفاعلات حسب النوع
              </CardTitle>
            </CardHeader>
            <CardContent>
              {interactionsByType.length > 0 ? (
                <CSSBarChart
                  data={interactionsByType.map((d) => ({
                    label: d.name,
                    value: d.value,
                    color: "hsl(345, 65%, 45%)",
                  }))}
                  unit=" دقيقة"
                  maxRows={10}
                />
              ) : (
                <EmptyState
                  title="لا توجد بيانات"
                  description="يرجى رفع ملف تفاعل الطلاب أولاً"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── الفلاتر ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5 text-muted-foreground" />
              الفلاتر
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">الدور</span>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأدوار</SelectItem>
                  <SelectItem value="teacher">معلم</SelectItem>
                  <SelectItem value="student">طالب</SelectItem>
                  <SelectItem value="parent">ولي أمر</SelectItem>
                  <SelectItem value="manager">مدير</SelectItem>
                  <SelectItem value="counselor">مرشد</SelectItem>
                  <SelectItem value="coordinator">منسق LMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">المدرسة</span>
              <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المدارس</SelectItem>
                  {schools.map((school) => (
                    <SelectItem key={school} value={school}>{school}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(roleFilter !== "all" || schoolFilter !== "all") && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => { setRoleFilter("all"); setSchoolFilter("all"); }}>
                مسح الفلاتر ×
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* ── جدول نشاط المستخدمين ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              نشاط المستخدمين
              {filteredUsers.length < userActivity.length && (
                <Badge variant="outline" className="mr-2 text-xs">
                  {filteredUsers.length.toLocaleString("en-US")} / {userActivity.length.toLocaleString("en-US")}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUsers.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full border-collapse text-sm" dir="rtl">
                  <thead>
                    <tr style={{ background: "#7f1d1d" }}>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-white w-10">#</th>
                      <th className="px-3 py-2.5 text-right text-xs font-bold text-white">اسم المستخدم</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-white">الدور</th>
                      <th className="px-3 py-2.5 text-right text-xs font-bold text-white">آخر نشاط</th>
                      <th className="px-3 py-2.5 text-right text-xs font-bold text-white">المدرسة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.slice(0, 50).map((user, index) => (
                      <tr key={user._id || index}
                        className="border-b border-slate-100"
                        style={{ background: index % 2 === 0 ? "#fff" : "#f8fafc" }}>
                        <td className="px-3 py-2 text-center text-slate-400 text-xs font-semibold">{index + 1}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800">{user.userName}</td>
                        <td className="px-3 py-2 text-center">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border"
                            style={
                              isTrue(user.isManager) ? { background: "#fffbeb", color: "#b45309", borderColor: "#fcd34d" }
                                : isTrue(user.isLmsCoordinator) ? { background: "#f0fdfa", color: "#0f766e", borderColor: "#5eead4" }
                                  : isTrue(user.isCounselor) ? { background: "#faf5ff", color: "#7e22ce", borderColor: "#d8b4fe" }
                                    : isTrue(user.isTeacher) ? { background: "#fef2f2", color: "#991b1b", borderColor: "#fca5a5" }
                                      : isTrue(user.isStudent) ? { background: "#eff6ff", color: "#1d4ed8", borderColor: "#93c5fd" }
                                        : isTrue(user.isParent) ? { background: "#f0fdf4", color: "#166534", borderColor: "#86efac" }
                                          : { background: "#f8fafc", color: "#475569", borderColor: "#e2e8f0" }
                            }>
                            {getRoleLabel(user)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-500 text-xs">{formatTimeAgo(user.lastActivityAt)}</td>
                        <td className="px-3 py-2 text-slate-500 text-xs">
                          {(user.schoolName || "").trim() || currentSchoolName || "غير محدد"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="لا يوجد مستخدمون"
                description="يرجى رفع ملف نشاط المستخدمين أولاً"
              />
            )}
          </CardContent>
        </Card>

        {/* ── جدول تفاعل الطلاب ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              تفاعل الطلاب مع المحتوى
              <span className="text-sm font-normal text-muted-foreground">(أعلى 20 طالب)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {interactionsByStudent.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full border-collapse text-sm" dir="rtl">
                  <thead>
                    <tr style={{ background: "#7f1d1d" }}>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-white w-10">#</th>
                      <th className="px-3 py-2.5 text-right text-xs font-bold text-white">اسم الطالب</th>
                      <th className="px-3 py-2.5 text-right text-xs font-bold text-white">المدرسة</th>
                      <th className="px-3 py-2.5 text-right text-xs font-bold text-white">المواد</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-white">إجمالي الوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interactionsByStudent.slice(0, 20).map((student, index) => (
                      <tr key={index}
                        className="border-b border-slate-100"
                        style={{ background: index % 2 === 0 ? "#fff" : "#fef2f2" }}>
                        <td className="px-3 py-2 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
                            style={{ background: index === 0 ? "#f59e0b" : index === 1 ? "#94a3b8" : index === 2 ? "#b45309" : "#7f1d1d" }}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-800">{student.studentName}</td>
                        <td className="px-3 py-2 text-slate-500 text-xs">{student.schoolName || currentSchoolName || "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {Object.keys(student.courses).slice(0, 3).map((course, idx) => (
                              <span key={idx} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border border-slate-300 text-slate-600 bg-slate-50">
                                {course}
                              </span>
                            ))}
                            {Object.keys(student.courses).length > 3 && (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-200 text-slate-600">
                                +{Object.keys(student.courses).length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold"
                            style={{ background: "#dcfce7", color: "#166534", border: "1px solid #86efac" }}>
                            {Number(student.totalTime).toLocaleString("en-US")} د
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="لا توجد تفاعلات"
                description="يرجى رفع ملف تفاعل الطلاب أولاً"
              />
            )}
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
};

export default UserActivityPage;
