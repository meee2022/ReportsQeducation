import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { BarChart3, Filter, TrendingUp, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { EmptyState } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";

const ComparisonsPage = () => {
  const [comparisonType, setComparisonType] = useState("subjects");

  // Fetch real data from Convex
  const lessonsAgg = useQuery("lessonsAgg:list");
  const assessmentsAgg = useQuery("assessmentsAgg:list");
  const studentLeaderboards = useQuery("studentLeaderboards:list");
  const teacherLeaderboards = useQuery("teacherLeaderboards:list");

  // Loading state
  if (lessonsAgg === undefined || assessmentsAgg === undefined) {
    return (
      <AppLayout title="المقارنات">
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">جاري تحميل البيانات...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const lessons = lessonsAgg || [];
  const assessments = assessmentsAgg || [];
  const students = studentLeaderboards || [];
  const teachers = teacherLeaderboards || [];

  // Aggregate data by subject
  const subjectComparison = useMemo(() => {
    const subjectMap = {};
    
    // Add lessons data
    lessons.forEach(l => {
      const subject = l.subjectName || 'غير محدد';
      if (!subjectMap[subject]) {
        subjectMap[subject] = { subject, lessons: 0, assessments: 0, avgSolve: 0, count: 0 };
      }
      subjectMap[subject].lessons += (l.totalLessons || 0);
    });
    
    // Add assessments data
    assessments.forEach(a => {
      const subject = a.subjectName || 'غير محدد';
      if (!subjectMap[subject]) {
        subjectMap[subject] = { subject, lessons: 0, assessments: 0, avgSolve: 0, count: 0 };
      }
      subjectMap[subject].assessments += (a.assessmentsCount || 0);
      subjectMap[subject].avgSolve += (a.solvePercentage || 0);
      subjectMap[subject].count += 1;
    });
    
    return Object.values(subjectMap).map(s => ({
      ...s,
      avgSolve: s.count > 0 ? Math.round(s.avgSolve / s.count) : 0
    }));
  }, [lessons, assessments]);

  // Aggregate by grade
  const gradeComparison = useMemo(() => {
    const gradeMap = {};
    
    lessons.forEach(l => {
      const grade = l.grade || 'غير محدد';
      if (!gradeMap[grade]) {
        gradeMap[grade] = { grade, lessons: 0, teachers: new Set() };
      }
      gradeMap[grade].lessons += (l.totalLessons || 0);
      if (l.teacherName) gradeMap[grade].teachers.add(l.teacherName);
    });
    
    return Object.values(gradeMap).map(g => ({
      grade: g.grade,
      lessons: g.lessons,
      teachers: g.teachers.size
    }));
  }, [lessons]);

  // Radar data for subjects
  const radarData = subjectComparison.slice(0, 6).map(s => ({
    subject: s.subject,
    الدروس: s.lessons,
    التقييمات: s.assessments,
    "نسبة الحل": s.avgSolve
  }));

  return (
    <AppLayout title="المقارنات">
      <div className="space-y-6">
        {/* Page Title */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">المقارنات والتحليلات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مقارنة الأداء بين المواد والصفوف - مدرسة ابن تيمية الثانوية للبنين
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">نوع المقارنة:</span>
              </div>
              <Select value={comparisonType} onValueChange={setComparisonType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="نوع المقارنة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subjects">مقارنة المواد</SelectItem>
                  <SelectItem value="grades">مقارنة الصفوف</SelectItem>
                  <SelectItem value="overview">نظرة عامة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Subjects Comparison */}
        {comparisonType === "subjects" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>مقارنة أداء المواد</CardTitle>
              </CardHeader>
              <CardContent>
                {radarData.length > 0 ? (
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis />
                        <Radar 
                          name="الدروس" 
                          dataKey="الدروس" 
                          stroke="hsl(345, 65%, 35%)" 
                          fill="hsl(345, 65%, 35%)" 
                          fillOpacity={0.3} 
                        />
                        <Radar 
                          name="التقييمات" 
                          dataKey="التقييمات" 
                          stroke="hsl(142, 50%, 45%)" 
                          fill="hsl(142, 50%, 45%)" 
                          fillOpacity={0.3} 
                        />
                        <Legend />
                        <Tooltip contentStyle={{ direction: 'rtl', textAlign: 'right' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState title="لا توجد بيانات" />
                )}
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>الدروس والتقييمات حسب المادة</CardTitle>
              </CardHeader>
              <CardContent>
                {subjectComparison.length > 0 ? (
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectComparison} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="subject" type="category" width={100} tick={{ fontSize: 10 }} />
                        <Tooltip 
                          contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                        />
                        <Legend />
                        <Bar dataKey="lessons" name="الدروس" fill="hsl(345, 65%, 35%)" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="assessments" name="التقييمات" fill="hsl(0, 0%, 50%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState title="لا توجد بيانات" />
                )}
              </CardContent>
            </Card>

            {/* Comparison Table */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>جدول مقارنة المواد</CardTitle>
              </CardHeader>
              <CardContent>
                {subjectComparison.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="p-3 text-right font-medium">المادة</th>
                          <th className="p-3 text-right font-medium">الدروس</th>
                          <th className="p-3 text-right font-medium">التقييمات</th>
                          <th className="p-3 text-right font-medium">متوسط نسبة الحل</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectComparison.map((item, index) => (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="p-3 font-medium">{item.subject}</td>
                            <td className="p-3">{item.lessons}</td>
                            <td className="p-3">{item.assessments}</td>
                            <td className="p-3">{item.avgSolve}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState title="لا توجد بيانات" />
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Grades Comparison */}
        {comparisonType === "grades" && (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>الدروس حسب الصف</CardTitle>
              </CardHeader>
              <CardContent>
                {gradeComparison.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gradeComparison}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="grade" />
                        <YAxis />
                        <Tooltip 
                          contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                        />
                        <Legend />
                        <Bar dataKey="lessons" name="الدروس" fill="hsl(345, 65%, 35%)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="teachers" name="المعلمين" fill="hsl(0, 0%, 50%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState title="لا توجد بيانات" />
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Overview */}
        {comparisonType === "overview" && (
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي الدروس</p>
                    <p className="text-3xl font-bold text-primary">
                      {lessons.reduce((sum, l) => sum + (l.totalLessons || 0), 0)}
                    </p>
                  </div>
                  <div className="rounded-full bg-primary/10 p-3">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي التقييمات</p>
                    <p className="text-3xl font-bold text-success">
                      {assessments.reduce((sum, a) => sum + (a.assessmentsCount || 0), 0)}
                    </p>
                  </div>
                  <div className="rounded-full bg-success/10 p-3">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">عدد المواد</p>
                    <p className="text-3xl font-bold text-info">
                      {subjectComparison.length}
                    </p>
                  </div>
                  <div className="rounded-full bg-info/10 p-3">
                    <Filter className="h-6 w-6 text-info" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ComparisonsPage;
