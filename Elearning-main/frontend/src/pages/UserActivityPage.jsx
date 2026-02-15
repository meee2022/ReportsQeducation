import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { Activity, Filter, User, Clock, School, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { EmptyState } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

const UserActivityPage = () => {
  const [roleFilter, setRoleFilter] = useState("all");
  const [schoolFilter, setSchoolFilter] = useState("all");

  // Fetch real data from Convex
  const userActivityData = useQuery("userActivity:list");
  const studentInteractionsData = useQuery("studentInteractions:list");

  // Memoized calculations - always call these hooks
  const userActivity = userActivityData || [];
  const studentInteractions = studentInteractionsData || [];

  // Get unique schools
  const schools = useMemo(() => {
    return [...new Set(userActivity.map(u => u.schoolName))].filter(Boolean);
  }, [userActivity]);

  // Get role label
  const getRoleLabel = (user) => {
    if (user.isTeacher) return "معلم";
    if (user.isStudent) return "طالب";
    if (user.isParent) return "ولي أمر";
    return "غير محدد";
  };

  // Get role badge variant
  const getRoleBadgeVariant = (user) => {
    if (user.isTeacher) return "default";
    if (user.isStudent) return "secondary";
    if (user.isParent) return "outline";
    return "outline";
  };

  // Filter data
  const filteredUsers = useMemo(() => {
    return userActivity
      .filter(u => {
        if (roleFilter === "all") return true;
        if (roleFilter === "teacher") return u.isTeacher;
        if (roleFilter === "student") return u.isStudent;
        if (roleFilter === "parent") return u.isParent;
        return true;
      })
      .filter(u => schoolFilter === "all" || u.schoolName === schoolFilter);
  }, [userActivity, roleFilter, schoolFilter]);

  // Calculate role distribution
  const roleDistribution = useMemo(() => {
    const teachers = userActivity.filter(u => u.isTeacher).length;
    const students = userActivity.filter(u => u.isStudent).length;
    const parents = userActivity.filter(u => u.isParent).length;
    return [
      { name: "معلم", value: teachers, color: "hsl(345, 65%, 35%)" },
      { name: "طالب", value: students, color: "hsl(0, 0%, 50%)" },
      { name: "ولي أمر", value: parents, color: "hsl(0, 0%, 30%)" },
    ].filter(item => item.value > 0);
  }, [userActivity]);

  // Aggregate interactions by section type
  const interactionsByType = useMemo(() => {
    const aggregated = {};
    studentInteractions.forEach(interaction => {
      const type = interaction.sectionType || "Other";
      aggregated[type] = (aggregated[type] || 0) + (interaction.totalTime || 0);
    });
    return Object.entries(aggregated).map(([name, value]) => ({
      name: name === "Assignment" ? "واجب" :
            name === "Section" ? "قسم" :
            name === "Quiz" ? "اختبار" :
            name === "Video" ? "فيديو" : name,
      value
    }));
  }, [studentInteractions]);

  // Aggregate interactions by student
  const interactionsByStudent = useMemo(() => {
    const aggregated = {};
    studentInteractions.forEach(interaction => {
      const studentName = `${interaction.firstName || ''} ${interaction.lastName || ''}`.trim();
      if (!studentName) return;
      
      if (!aggregated[studentName]) {
        aggregated[studentName] = {
          studentName,
          schoolName: interaction.schoolName,
          courses: {},
          totalTime: 0
        };
      }
      aggregated[studentName].totalTime += (interaction.totalTime || 0);
      const courseName = interaction.courseName || 'غير محدد';
      aggregated[studentName].courses[courseName] = 
        (aggregated[studentName].courses[courseName] || 0) + (interaction.totalTime || 0);
    });
    return Object.values(aggregated);
  }, [studentInteractions]);

  // Format time ago
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

  const totalInteractionTime = studentInteractions.reduce((sum, i) => sum + (i.totalTime || 0), 0);

  // Loading state - render after all hooks
  if (userActivityData === undefined || studentInteractionsData === undefined) {
    return (
      <AppLayout title="نشاط المستخدمين">
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
    <AppLayout title="نشاط المستخدمين">
      <div className="space-y-6">
        {/* Page Title */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">نشاط المستخدمين وتفاعل الطلاب</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            متابعة نشاط المستخدمين وتحليل تفاعل الطلاب مع المحتوى التعليمي - مدرسة ابن تيمية الثانوية للبنين
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المستخدمين</p>
                  <p className="text-2xl font-bold">{userActivity.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-success/10 p-3">
                  <Activity className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي التفاعلات</p>
                  <p className="text-2xl font-bold">{studentInteractions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-info/10 p-3">
                  <Clock className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي وقت التفاعل</p>
                  <p className="text-2xl font-bold">
                    {totalInteractionTime} دقيقة
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-warning/10 p-3">
                  <School className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">عدد المدارس</p>
                  <p className="text-2xl font-bold">{schools.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Role Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>توزيع المستخدمين حسب الدور</CardTitle>
            </CardHeader>
            <CardContent>
              {roleDistribution.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={roleDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {roleDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                        formatter={(value, name) => [`${value} مستخدم`, name]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState title="لا توجد بيانات" description="يرجى رفع ملف نشاط المستخدمين أولاً" />
              )}
            </CardContent>
          </Card>

          {/* Interactions by Type */}
          <Card>
            <CardHeader>
              <CardTitle>توزيع التفاعلات حسب النوع</CardTitle>
            </CardHeader>
            <CardContent>
              {interactionsByType.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={interactionsByType}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                        formatter={(value) => [`${value} دقيقة`, 'الوقت']}
                      />
                      <Bar dataKey="value" fill="hsl(345, 65%, 35%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState title="لا توجد بيانات" description="يرجى رفع ملف تفاعل الطلاب أولاً" />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Student Interactions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              تفاعل الطلاب مع المحتوى (أول 20 طالب)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {interactionsByStudent.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم الطالب</TableHead>
                    <TableHead className="text-right">المدرسة</TableHead>
                    <TableHead className="text-right">المواد</TableHead>
                    <TableHead className="text-right">إجمالي الوقت (دقيقة)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interactionsByStudent.slice(0, 20).map((student, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{student.studentName}</TableCell>
                      <TableCell className="text-muted-foreground">{student.schoolName}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(student.courses).slice(0, 3).map((course, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {course}
                            </Badge>
                          ))}
                          {Object.keys(student.courses).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{Object.keys(student.courses).length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-primary/10 text-primary border-0">
                          {student.totalTime} دقيقة
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="لا توجد تفاعلات" description="يرجى رفع ملف تفاعل الطلاب أولاً" />
            )}
          </CardContent>
        </Card>

        {/* User Activity Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              نشاط المستخدمين
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="mb-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">تصفية:</span>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="الدور" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأدوار</SelectItem>
                  <SelectItem value="teacher">معلم</SelectItem>
                  <SelectItem value="student">طالب</SelectItem>
                  <SelectItem value="parent">ولي أمر</SelectItem>
                </SelectContent>
              </Select>
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
            </div>

            {filteredUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم المستخدم</TableHead>
                    <TableHead className="text-right">الدور</TableHead>
                    <TableHead className="text-right">آخر نشاط</TableHead>
                    <TableHead className="text-right">المدرسة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.slice(0, 20).map((user, index) => (
                    <TableRow key={user._id || index}>
                      <TableCell className="font-medium">{user.userName}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user)}>
                          {getRoleLabel(user)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatTimeAgo(user.lastActivity)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.schoolName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="لا يوجد مستخدمون" description="يرجى رفع ملف نشاط المستخدمين أولاً" />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default UserActivityPage;
