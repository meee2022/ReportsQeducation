import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { Trophy, Users, School, TrendingUp, Filter, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { StatCard, StarRating, RankBadge, LevelBadge, EmptyState } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from "recharts";

const LeaderboardsPage = () => {
  const [activeTab, setActiveTab] = useState("teachers");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table");

  // Fetch real data from Convex
  const teacherLeaderboards = useQuery("teacherLeaderboards:list");
  const studentLeaderboards = useQuery("studentLeaderboards:list");

  // Loading state
  const isLoading = teacherLeaderboards === undefined || studentLeaderboards === undefined;

  // Use real data
  const teachers = teacherLeaderboards || [];
  const students = studentLeaderboards || [];

  // Get unique schools
  const schools = useMemo(() => {
    const allSchools = [...new Set([
      ...teachers.map(t => t.schoolName), 
      ...students.map(s => s.schoolName)
    ])];
    return allSchools.filter(Boolean);
  }, [teachers, students]);

  // Get unique grades for students
  const grades = useMemo(() => {
    return [...new Set(students.map(s => s.grade))].filter(Boolean);
  }, [students]);

  // Filter data
  const filteredTeachers = useMemo(() => {
    return teachers
      .filter(t => schoolFilter === "all" || t.schoolName === schoolFilter)
      .filter(t => levelFilter === "all" || t.level?.toString() === levelFilter)
      .sort((a, b) => (b.points || 0) - (a.points || 0));
  }, [teachers, schoolFilter, levelFilter]);

  const filteredStudents = useMemo(() => {
    return students
      .filter(s => schoolFilter === "all" || s.schoolName === schoolFilter)
      .filter(s => gradeFilter === "all" || s.grade === gradeFilter)
      .sort((a, b) => (b.points || 0) - (a.points || 0));
  }, [students, schoolFilter, gradeFilter]);

  // Calculate stats
  const teacherStats = useMemo(() => ({
    total: filteredTeachers.length,
    avgPoints: filteredTeachers.length > 0 
      ? Math.round(filteredTeachers.reduce((sum, t) => sum + (t.points || 0), 0) / filteredTeachers.length) 
      : 0,
    schoolsCount: new Set(filteredTeachers.map(t => t.schoolName)).size,
    topTeacher: filteredTeachers[0],
  }), [filteredTeachers]);

  const studentStats = useMemo(() => ({
    total: filteredStudents.length,
    avgPoints: filteredStudents.length > 0 
      ? Math.round(filteredStudents.reduce((sum, s) => sum + (s.points || 0), 0) / filteredStudents.length) 
      : 0,
    schoolsCount: new Set(filteredStudents.map(s => s.schoolName)).size,
    topStudent: filteredStudents[0],
  }), [filteredStudents]);

  // Level distribution
  const levelDistribution = useMemo(() => {
    const distribution = {};
    const data = activeTab === "teachers" ? filteredTeachers : filteredStudents;
    data.forEach(item => {
      const level = item.level || 0;
      distribution[level] = (distribution[level] || 0) + 1;
    });
    return Object.entries(distribution).map(([level, count]) => ({
      name: level === "0" ? "المستوى صفر" : `المستوى ${level === "1" ? "الأول" : level === "2" ? "الثاني" : level}`,
      value: count,
    }));
  }, [activeTab, filteredTeachers, filteredStudents]);

  // Calculate rating from points
  const getRating = (points) => {
    if (points >= 250) return 5;
    if (points >= 150) return 4;
    if (points >= 100) return 3;
    if (points >= 50) return 2;
    return 1;
  };

  if (isLoading) {
    return (
      <AppLayout title="لوحات الصدارة">
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
    <AppLayout title="لوحات الصدارة">
      <div className="space-y-6">
        {/* Page Title */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">لوحات الصدارة</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTab === "teachers" ? "صدارة المعلمين" : "صدارة الطلاب"} - مرتب حسب النقاط تنازلياً
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="teachers" className="gap-2">
              <Users className="h-4 w-4" />
              صدارة المعلمين ({teachers.length})
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-2">
              <Trophy className="h-4 w-4" />
              صدارة الطلاب ({students.length})
            </TabsTrigger>
          </TabsList>

          {/* Teachers Tab */}
          <TabsContent value="teachers" className="space-y-6 mt-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                title="إجمالي المعلمين"
                value={teacherStats.total}
                icon={Users}
                variant="primary"
              />
              <StatCard
                title="المدارس"
                value={teacherStats.schoolsCount}
                icon={School}
                variant="success"
              />
              <StatCard
                title="متوسط النقاط"
                value={teacherStats.avgPoints}
                icon={TrendingUp}
                variant="info"
              />
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-warning/10 p-3">
                    <Trophy className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">أفضل معلم</p>
                    <p className="font-semibold text-sm truncate">{teacherStats.topTeacher?.teacherName || "-"}</p>
                    <p className="text-xs text-primary">{teacherStats.topTeacher?.points || 0} نقطة</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Level Distribution */}
            {levelDistribution.length > 0 && (
              <Card>
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium">توزيع المستويات:</span>
                    {levelDistribution.map((item, idx) => (
                      <Badge key={idx} variant="outline" className="gap-1">
                        {item.name}: {item.value} معلم
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
                  <Select value={levelFilter} onValueChange={setLevelFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="المستوى" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المستويات</SelectItem>
                      <SelectItem value="0">المستوى صفر</SelectItem>
                      <SelectItem value="1">المستوى الأول</SelectItem>
                      <SelectItem value="2">المستوى الثاني</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="mr-auto flex gap-2">
                    <Button 
                      variant={viewMode === "table" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setViewMode("table")}
                    >
                      جدول
                    </Button>
                    <Button 
                      variant={viewMode === "chart" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setViewMode("chart")}
                    >
                      رسم بياني
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content based on view mode */}
            {viewMode === "table" && (
              <Card>
                <CardHeader>
                  <CardTitle>جدول صدارة المعلمين</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredTeachers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">الترتيب</TableHead>
                          <TableHead className="text-right">اسم المعلم</TableHead>
                          <TableHead className="text-right">المدرسة</TableHead>
                          <TableHead className="text-right">اسم لوحة الصدارة</TableHead>
                          <TableHead className="text-right">المستوى</TableHead>
                          <TableHead className="text-right">النقاط</TableHead>
                          <TableHead className="text-right">التقييم</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTeachers.map((teacher, index) => (
                          <TableRow key={teacher._id || index} className="hover:bg-muted/50">
                            <TableCell>
                              <RankBadge rank={index + 1} />
                            </TableCell>
                            <TableCell className="font-medium">{teacher.teacherName}</TableCell>
                            <TableCell className="text-muted-foreground">{teacher.schoolName}</TableCell>
                            <TableCell className="text-muted-foreground">{teacher.boardName}</TableCell>
                            <TableCell>
                              <LevelBadge level={teacher.level} />
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                                {teacher.points} نقطة
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <StarRating rating={getRating(teacher.points)} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <EmptyState 
                      title="لا توجد بيانات معلمين" 
                      description="يرجى رفع ملف صدارة المعلمين أولاً"
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {viewMode === "chart" && (
              <Card>
                <CardHeader>
                  <CardTitle>توزيع النقاط - أعلى 10 معلمين</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredTeachers.length > 0 ? (
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={filteredTeachers.slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis 
                            dataKey="teacherName" 
                            type="category" 
                            width={180}
                            tick={{ fontSize: 10 }}
                          />
                          <Tooltip 
                            contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                            formatter={(value) => [`${value} نقطة`, 'النقاط']}
                          />
                          <Bar dataKey="points" fill="hsl(345, 65%, 35%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyState title="لا توجد بيانات" />
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-6 mt-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                title="إجمالي الطلاب"
                value={studentStats.total}
                icon={Trophy}
                variant="primary"
              />
              <StatCard
                title="المدارس"
                value={studentStats.schoolsCount}
                icon={School}
                variant="success"
              />
              <StatCard
                title="متوسط النقاط"
                value={studentStats.avgPoints}
                icon={TrendingUp}
                variant="info"
              />
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-warning/10 p-3">
                    <Trophy className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">أفضل طالب</p>
                    <p className="font-semibold text-sm truncate">
                      {studentStats.topStudent?.firstName} {studentStats.topStudent?.lastName || "-"}
                    </p>
                    <p className="text-xs text-primary">{studentStats.topStudent?.points || 0} نقطة</p>
                  </div>
                </div>
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

            {/* Students Table */}
            <Card>
              <CardHeader>
                <CardTitle>جدول صدارة الطلاب</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredStudents.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الترتيب</TableHead>
                        <TableHead className="text-right">اسم الطالب</TableHead>
                        <TableHead className="text-right">الصف</TableHead>
                        <TableHead className="text-right">النقاط</TableHead>
                        <TableHead className="text-right">المستوى</TableHead>
                        <TableHead className="text-right">المدرسة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student, index) => (
                        <TableRow key={student._id || index}>
                          <TableCell>
                            <RankBadge rank={index + 1} />
                          </TableCell>
                          <TableCell className="font-medium">
                            {student.firstName} {student.lastName}
                          </TableCell>
                          <TableCell>{student.grade}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                              {student.points} نقطة
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <LevelBadge level={student.level} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">{student.schoolName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState 
                    title="لا توجد بيانات طلاب"
                    description="يرجى رفع ملف صدارة الطلاب أولاً"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default LeaderboardsPage;
