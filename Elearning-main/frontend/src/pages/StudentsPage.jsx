import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { GraduationCap, Filter, BookOpen, Clock, TrendingUp, Award, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { StatCard, EmptyState } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from "recharts";

const StudentsPage = () => {
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");

  // Fetch real data from Convex
  const studentInteractionsData = useQuery("studentInteractions:list");

  // Use data or empty array
  const studentInteractions = studentInteractionsData || [];

  // Aggregate interactions by student - always call useMemo
  const studentData = useMemo(() => {
    const aggregated = {};
    studentInteractions.forEach(interaction => {
      const studentName = `${interaction.firstName || ''} ${interaction.lastName || ''}`.trim();
      if (!studentName) return;
      
      const key = `${studentName}-${interaction.schoolName}`;
      if (!aggregated[key]) {
        aggregated[key] = {
          studentName,
          firstName: interaction.firstName,
          lastName: interaction.lastName,
          schoolName: interaction.schoolName,
          courses: new Set(),
          totalTime: 0,
          interactions: 0
        };
      }
      aggregated[key].totalTime += (interaction.totalTime || 0);
      aggregated[key].interactions += 1;
      if (interaction.courseName) {
        aggregated[key].courses.add(interaction.courseName);
      }
    });
    
    return Object.values(aggregated).map(s => ({
      ...s,
      courses: Array.from(s.courses)
    }));
  }, [studentInteractions]);

  // Get unique values for filters
  const schools = useMemo(() => {
    return [...new Set(studentData.map(s => s.schoolName))].filter(Boolean);
  }, [studentData]);
  
  const allCourses = useMemo(() => {
    return [...new Set(studentInteractions.map(i => i.courseName))].filter(Boolean);
  }, [studentInteractions]);

  // Filter data
  const filteredStudents = useMemo(() => {
    return studentData
      .filter(s => schoolFilter === "all" || s.schoolName === schoolFilter)
      .filter(s => courseFilter === "all" || s.courses.includes(courseFilter));
  }, [studentData, schoolFilter, courseFilter]);

  // Calculate stats
  const stats = useMemo(() => ({
    totalStudents: filteredStudents.length,
    totalInteractions: filteredStudents.reduce((sum, s) => sum + s.interactions, 0),
    avgTime: filteredStudents.length > 0 
      ? Math.round(filteredStudents.reduce((sum, s) => sum + s.totalTime, 0) / filteredStudents.length) 
      : 0,
    totalTime: filteredStudents.reduce((sum, s) => sum + s.totalTime, 0),
  }), [filteredStudents]);

  // Top students by time
  const topStudents = useMemo(() => {
    return [...filteredStudents]
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 10);
  }, [filteredStudents]);

  // Loading state - after all hooks
  if (studentInteractionsData === undefined) {
    return (
      <AppLayout title="الطلاب">
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">جاري تحميل البيانات...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="الطلاب">
      <div className="space-y-6">
        {/* Page Title */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">تفاعل الطلاب</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            تحليل تفاعل الطلاب مع المحتوى التعليمي - مدرسة ابن تيمية الثانوية للبنين
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="إجمالي الطلاب"
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
            value={`${stats.avgTime} دقيقة`}
            icon={Clock}
            variant="success"
          />
          <StatCard
            title="إجمالي وقت التفاعل"
            value={`${stats.totalTime} دقيقة`}
            icon={TrendingUp}
            variant="warning"
          />
        </div>

        {/* Top Students Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              أعلى الطلاب تفاعلاً (حسب الوقت)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topStudents.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topStudents} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="studentName"
                      type="category" 
                      width={120}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                      formatter={(value) => [`${value} دقيقة`, 'وقت التفاعل']}
                    />
                    <Bar dataKey="totalTime" fill="hsl(345, 65%, 35%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState 
                title="لا توجد بيانات"
                description="يرجى رفع ملف تفاعل الطلاب أولاً"
              />
            )}
          </CardContent>
        </Card>

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
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="المادة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المواد</SelectItem>
                  {allCourses.map(course => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              جدول تفاعل الطلاب
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredStudents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم الطالب</TableHead>
                    <TableHead className="text-right">المدرسة</TableHead>
                    <TableHead className="text-right">المواد</TableHead>
                    <TableHead className="text-right">عدد التفاعلات</TableHead>
                    <TableHead className="text-right">إجمالي الوقت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.slice(0, 30).map((student, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {student.studentName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{student.schoolName}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {student.courses.slice(0, 3).map((course, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {course}
                            </Badge>
                          ))}
                          {student.courses.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{student.courses.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{student.interactions}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-info/10 text-info border-info/20">
                          {student.totalTime} دقيقة
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState 
                title="لا توجد بيانات طلاب"
                description="يرجى رفع ملف تفاعل الطلاب أولاً"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default StudentsPage;
