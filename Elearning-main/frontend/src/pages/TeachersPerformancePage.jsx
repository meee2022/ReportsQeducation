import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { Users, BookOpen, Filter, TrendingUp, Award, BarChart3, Calendar, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { StatCard, EmptyState } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Cell
} from "recharts";

const TeachersPerformancePage = () => {
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");

  // Fetch real data from Convex
  const lessonsAgg = useQuery("lessonsAgg:list");

  // Loading state
  if (lessonsAgg === undefined) {
    return (
      <AppLayout title="أداء المعلمين">
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">جاري تحميل البيانات...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const teachers = lessonsAgg || [];

  // Get unique values for filters
  const schools = [...new Set(teachers.map(t => t.schoolName))].filter(Boolean);
  const subjects = [...new Set(teachers.map(t => t.subjectName))].filter(Boolean);
  const grades = [...new Set(teachers.map(t => t.grade))].filter(Boolean);

  // Filter data
  const filteredTeachers = teachers
    .filter(t => schoolFilter === "all" || t.schoolName === schoolFilter)
    .filter(t => subjectFilter === "all" || t.subjectName === subjectFilter)
    .filter(t => gradeFilter === "all" || t.grade === gradeFilter);

  // Calculate stats
  const stats = {
    totalTeachers: filteredTeachers.length,
    totalLessons: filteredTeachers.reduce((sum, t) => sum + (t.totalLessons || 0), 0),
    avgLinkedToOutcomes: filteredTeachers.length > 0 
      ? Math.round(filteredTeachers.reduce((sum, t) => sum + (t.linkedToOutcomes || 0), 0) / filteredTeachers.length) 
      : 0,
    avgLinkedToSchedule: filteredTeachers.length > 0 
      ? Math.round(filteredTeachers.reduce((sum, t) => sum + (t.linkedToSchedule || 0), 0) / filteredTeachers.length) 
      : 0,
  };

  // Top teachers by lessons
  const topTeachersByLessons = [...filteredTeachers]
    .filter(t => (t.totalLessons || 0) > 0)
    .sort((a, b) => (b.totalLessons || 0) - (a.totalLessons || 0))
    .slice(0, 10);

  // Linked to outcomes distribution
  const outcomesDistribution = [
    { name: "مرتبطة بالمخرجات", value: filteredTeachers.filter(t => (t.linkedToOutcomes || 0) > 0).length },
    { name: "غير مرتبطة", value: filteredTeachers.filter(t => (t.linkedToOutcomes || 0) === 0).length },
  ];

  const COLORS = ["hsl(142, 50%, 45%)", "hsl(0, 0%, 70%)"];

  const formatDate = (dateString) => {
    if (!dateString) return "غير متوفر";
    try {
      return new Date(dateString).toLocaleDateString('ar-SA');
    } catch {
      return "غير متوفر";
    }
  };

  return (
    <AppLayout title="أداء المعلمين">
      <div className="space-y-6">
        {/* Page Title */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">أداء المعلمين</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            البيانات مأخوذة من ملف الدروس المجمعة - مدرسة ابن تيمية الثانوية للبنين
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="إجمالي السجلات"
            value={stats.totalTeachers}
            icon={Users}
            variant="primary"
          />
          <StatCard
            title="إجمالي الدروس"
            value={stats.totalLessons}
            icon={BookOpen}
            variant="info"
          />
          <StatCard
            title="الالتزام بالمخرجات"
            value={`${stats.avgLinkedToOutcomes}%`}
            icon={TrendingUp}
            variant="success"
          />
          <StatCard
            title="مربوط بالجدول"
            value={`${stats.avgLinkedToSchedule}%`}
            icon={Calendar}
            variant="warning"
          />
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Teachers by Lessons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                أعلى 10 معلمين حسب عدد الدروس
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topTeachersByLessons.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topTeachersByLessons} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="teacherName" 
                        type="category" 
                        width={150}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip 
                        contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                        formatter={(value) => [`${value} درس`, 'عدد الدروس']}
                      />
                      <Bar dataKey="totalLessons" fill="hsl(345, 65%, 35%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState 
                  title="لا توجد بيانات" 
                  description="لم يتم العثور على دروس للمعلمين"
                />
              )}
            </CardContent>
          </Card>

          {/* Outcomes Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                توزيع الدروس المرتبطة بالمخرجات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={outcomesDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {outcomesDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                      formatter={(value, name) => [`${value} سجل`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 flex justify-center gap-4">
                  {outcomesDistribution.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index] }}
                      />
                      <span className="text-sm">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">تصفية:</span>
              </div>
              <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="المدرسة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المدارس</SelectItem>
                  {schools.map(school => (
                    <SelectItem key={school} value={school}>{school}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="المادة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المواد</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="الصف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الصفوف</SelectItem>
                  {grades.map(grade => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Teachers Table */}
        <Card>
          <CardHeader>
            <CardTitle>جدول أداء المعلمين</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTeachers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم المعلم</TableHead>
                    <TableHead className="text-right">المادة</TableHead>
                    <TableHead className="text-right">الصف</TableHead>
                    <TableHead className="text-right">عدد الصفوف</TableHead>
                    <TableHead className="text-right">عدد الدروس</TableHead>
                    <TableHead className="text-right">المرتبطة بالمخرجات</TableHead>
                    <TableHead className="text-right">المواد المربوطة بالجدول</TableHead>
                    <TableHead className="text-right">آخر درس</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher, index) => (
                    <TableRow key={teacher._id || index}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{teacher.teacherName}</p>
                          <p className="text-xs text-muted-foreground">{teacher.schoolName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{teacher.subjectName}</Badge>
                      </TableCell>
                      <TableCell>{teacher.grade}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-info/10 text-info border-info/20">
                          {teacher.totalClasses || 0} صفوف
                        </Badge>
                      </TableCell>
                      <TableCell>{teacher.totalLessons || 0}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={teacher.linkedToOutcomes || 0} 
                            className="h-2 w-16"
                          />
                          <span className={`text-sm ${(teacher.linkedToOutcomes || 0) > 0 ? 'text-success' : 'text-destructive'}`}>
                            {teacher.linkedToOutcomes || 0}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{teacher.linkedToSchedule || 0}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(teacher.lastLesson)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState 
                title="لا توجد بيانات معلمين"
                description="يرجى رفع ملف الدروس المجمعة أولاً"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default TeachersPerformancePage;
