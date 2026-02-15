import React, { useMemo } from "react";
import { useQuery } from "convex/react";
import { 
  BookOpen, 
  FileText, 
  Users, 
  GraduationCap, 
  Clock,
  TrendingUp,
  BarChart3,
  Activity,
  Loader2,
  AlertCircle
} from "lucide-react";
import { AppLayout } from "@/components/layout";
import { StatCard, EmptyState } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const DashboardPage = () => {
  // Fetch real data from Convex
  const lessonsAgg = useQuery("lessonsAgg:list");
  const assessmentsAgg = useQuery("assessmentsAgg:list");
  const studentLeaderboards = useQuery("studentLeaderboards:list");
  const teacherLeaderboards = useQuery("teacherLeaderboards:list");
  const studentInteractions = useQuery("studentInteractions:list");
  const userActivity = useQuery("userActivity:list");

  // Calculate stats from real data
  const stats = useMemo(() => {
    return {
      totalLessons: lessonsAgg?.length || 0,
      totalAssessments: assessmentsAgg?.length || 0,
      totalStudentsOnLb: studentLeaderboards?.length || 0,
      totalTeachersOnLb: teacherLeaderboards?.length || 0,
      totalInteractionTime: studentInteractions?.reduce((sum, i) => sum + (i.totalTime || 0), 0) || 0,
    };
  }, [lessonsAgg, assessmentsAgg, studentLeaderboards, teacherLeaderboards, studentInteractions]);

  // Loading state
  const isLoading = lessonsAgg === undefined && assessmentsAgg === undefined;

  // Format time from minutes
  const formatTime = (minutes) => {
    if (!minutes) return "0 دقيقة";
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours} ساعة ${mins > 0 ? `و ${mins} دقيقة` : ""}`;
    }
    return `${minutes} دقيقة`;
  };

  // Calculate subject data from lessons
  const subjectData = useMemo(() => {
    if (!lessonsAgg || lessonsAgg.length === 0) return [];
    
    const subjectMap = {};
    lessonsAgg.forEach(lesson => {
      const subject = lesson.subjectName || "غير محدد";
      if (!subjectMap[subject]) {
        subjectMap[subject] = { name: subject, lessons: 0 };
      }
      subjectMap[subject].lessons += lesson.totalLessons || 1;
    });
    
    return Object.values(subjectMap).sort((a, b) => b.lessons - a.lessons).slice(0, 8);
  }, [lessonsAgg]);

  // Calculate user roles from userActivity
  const userRolesData = useMemo(() => {
    if (!userActivity || userActivity.length === 0) return [];
    
    let teachers = 0, students = 0, parents = 0;
    userActivity.forEach(user => {
      if (user.isTeacher) teachers++;
      if (user.isStudent) students++;
      if (user.isParent) parents++;
    });
    
    return [
      { name: "طالب", value: students, color: "hsl(345, 65%, 35%)" },
      { name: "معلم", value: teachers, color: "hsl(0, 0%, 50%)" },
      { name: "ولي أمر", value: parents, color: "hsl(0, 0%, 30%)" },
    ].filter(item => item.value > 0);
  }, [userActivity]);

  if (isLoading) {
    return (
      <AppLayout title="نظرة عامة">
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">جاري تحميل البيانات...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Check if we have any data
  const hasData = (lessonsAgg && lessonsAgg.length > 0) || 
                  (assessmentsAgg && assessmentsAgg.length > 0) ||
                  (studentLeaderboards && studentLeaderboards.length > 0) ||
                  (teacherLeaderboards && teacherLeaderboards.length > 0);

  return (
    <AppLayout title="نظرة عامة">
      <div className="space-y-6">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">لوحة التحكم الرئيسية</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            نظرة عامة على أداء النظام التعليمي - مدرسة ابن تيمية الثانوية للبنين
          </p>
        </div>

        {/* No Data Warning */}
        {!hasData && (
          <Card className="border-warning bg-warning/10">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium text-warning">لا توجد بيانات</p>
                  <p className="text-sm text-muted-foreground">
                    يرجى رفع الملفات من صفحة "رفع الملفات" لعرض البيانات
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="إجمالي سجلات الدروس"
            value={stats.totalLessons.toLocaleString('ar-SA')}
            icon={BookOpen}
            variant="primary"
          />
          <StatCard
            title="إجمالي سجلات التقييمات"
            value={stats.totalAssessments.toLocaleString('ar-SA')}
            icon={FileText}
            variant="info"
          />
          <StatCard
            title="عدد الطلاب في لوحات الصدارة"
            value={stats.totalStudentsOnLb.toLocaleString('ar-SA')}
            icon={GraduationCap}
            variant="success"
          />
          <StatCard
            title="عدد المعلمين في لوحات الصدارة"
            value={stats.totalTeachersOnLb.toLocaleString('ar-SA')}
            icon={Users}
            variant="warning"
          />
          <StatCard
            title="إجمالي وقت تفاعل الطلاب"
            value={formatTime(stats.totalInteractionTime)}
            icon={Clock}
            variant="default"
          />
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Subjects Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                الدروس حسب المادة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subjectData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={120}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          direction: 'rtl',
                          textAlign: 'right',
                          borderRadius: '8px',
                          border: '1px solid hsl(var(--border))'
                        }}
                        formatter={(value) => [`${value} سجل`, 'الدروس']}
                      />
                      <Bar 
                        dataKey="lessons" 
                        name="الدروس" 
                        fill="hsl(345, 65%, 35%)" 
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState 
                  title="لا توجد بيانات"
                  description="يرجى رفع ملف الدروس المجمعة أولاً"
                />
              )}
            </CardContent>
          </Card>

          {/* User Roles Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                توزيع المستخدمين حسب الدور
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userRolesData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userRolesData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {userRolesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          direction: 'rtl',
                          textAlign: 'right',
                          borderRadius: '8px',
                          border: '1px solid hsl(var(--border))'
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value) => <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState 
                  title="لا توجد بيانات"
                  description="يرجى رفع ملف نشاط المستخدمين أولاً"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              إحصائيات سريعة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-4 text-center">
                <p className="text-3xl font-bold text-primary">
                  {stats.totalLessons > 0 && stats.totalAssessments > 0 
                    ? Math.round((stats.totalAssessments / stats.totalLessons) * 100) 
                    : 0}%
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  نسبة التقييمات للدروس
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 text-center">
                <p className="text-3xl font-bold text-primary">
                  {stats.totalStudentsOnLb > 0 && stats.totalInteractionTime > 0
                    ? Math.round(stats.totalInteractionTime / stats.totalStudentsOnLb)
                    : 0}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  متوسط وقت التفاعل لكل طالب (دقيقة)
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 text-center">
                <p className="text-3xl font-bold text-primary">
                  {stats.totalTeachersOnLb > 0 && stats.totalStudentsOnLb > 0
                    ? Math.round(stats.totalStudentsOnLb / stats.totalTeachersOnLb)
                    : 0}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  نسبة الطلاب للمعلمين
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
