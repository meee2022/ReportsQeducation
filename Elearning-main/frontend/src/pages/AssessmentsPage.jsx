import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { FileSpreadsheet, Filter, ExternalLink, Users, CheckCircle, Clock, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { EmptyState } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const AssessmentsPage = () => {
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

  // Fetch real data from Convex
  const assessmentsAgg = useQuery("assessmentsAgg:list");

  // Loading state
  if (assessmentsAgg === undefined) {
    return (
      <AppLayout title="التقييمات">
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">جاري تحميل البيانات...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const assessments = assessmentsAgg || [];

  // Get unique values for filters
  const schools = [...new Set(assessments.map(a => a.schoolName))].filter(Boolean);
  const grades = [...new Set(assessments.map(a => a.grade))].filter(Boolean);
  const sections = [...new Set(assessments.map(a => a.section))].filter(Boolean);
  const subjects = [...new Set(assessments.map(a => a.subjectName))].filter(Boolean);

  // Filter data
  const filteredAssessments = assessments
    .filter(a => schoolFilter === "all" || a.schoolName === schoolFilter)
    .filter(a => gradeFilter === "all" || a.grade === gradeFilter)
    .filter(a => sectionFilter === "all" || a.section === sectionFilter)
    .filter(a => subjectFilter === "all" || a.subjectName === subjectFilter);

  // Calculate stats
  const stats = {
    totalAssessments: filteredAssessments.reduce((sum, a) => sum + (a.assessmentsCount || 0), 0),
    totalSubmissions: filteredAssessments.reduce((sum, a) => sum + (a.submissionsCount || 0), 0),
    avgSolveRate: filteredAssessments.length > 0 
      ? Math.round(filteredAssessments.reduce((sum, a) => sum + (a.solvePercentage || 0), 0) / filteredAssessments.length) 
      : 0,
    avgCorrectionRate: filteredAssessments.length > 0 
      ? Math.round(filteredAssessments.reduce((sum, a) => sum + (a.correctionCompletionPercentage || 0), 0) / filteredAssessments.length) 
      : 0,
  };

  const getProgressColor = (value) => {
    if (value >= 90) return "bg-success";
    if (value >= 70) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <AppLayout title="التقييمات">
      <div className="space-y-6">
        {/* Page Title */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">صفحة التقييمات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            عرض وتحليل بيانات التقييمات للمواد الدراسية - مدرسة ابن تيمية الثانوية للبنين
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي التقييمات</p>
                  <p className="text-2xl font-bold">{stats.totalAssessments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-info/10 p-3">
                  <Users className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي التسليمات</p>
                  <p className="text-2xl font-bold">{stats.totalSubmissions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-success/10 p-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">متوسط نسبة الحل</p>
                  <p className="text-2xl font-bold">{stats.avgSolveRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-warning/10 p-3">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">متوسط نسبة التصحيح</p>
                  <p className="text-2xl font-bold">{stats.avgCorrectionRate}%</p>
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
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="الصف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الصفوف</SelectItem>
                  {grades.map(grade => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="الشعبة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الشعب</SelectItem>
                  {sections.map(section => (
                    <SelectItem key={section} value={section}>الشعبة {section}</SelectItem>
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
            </div>
          </CardContent>
        </Card>

        {/* Assessments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              جدول التقييمات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAssessments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المادة</TableHead>
                    <TableHead className="text-right">الصف</TableHead>
                    <TableHead className="text-right">الشعبة</TableHead>
                    <TableHead className="text-right">المعلم</TableHead>
                    <TableHead className="text-right">الطلاب</TableHead>
                    <TableHead className="text-right">التقييمات</TableHead>
                    <TableHead className="text-right">التسليمات</TableHead>
                    <TableHead className="text-right">نسبة الحل</TableHead>
                    <TableHead className="text-right">نسبة التصحيح</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssessments.map((assessment, index) => (
                    <TableRow key={assessment._id || index}>
                      <TableCell className="font-medium">{assessment.subjectName}</TableCell>
                      <TableCell>{assessment.grade}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{assessment.section}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{assessment.teacherName}</TableCell>
                      <TableCell>{assessment.totalStudents}</TableCell>
                      <TableCell>{assessment.assessmentsCount}</TableCell>
                      <TableCell>{assessment.submissionsCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={assessment.solvePercentage || 0} 
                            className={`h-2 w-16 ${getProgressColor(assessment.solvePercentage || 0)}`}
                          />
                          <span className="text-sm">{assessment.solvePercentage || 0}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={assessment.correctionCompletionPercentage || 0} 
                            className={`h-2 w-16 ${getProgressColor(assessment.correctionCompletionPercentage || 0)}`}
                          />
                          <span className="text-sm">{assessment.correctionCompletionPercentage || 0}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {assessment.assessmentsUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(assessment.assessmentsUrl, '_blank')}
                            className="gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            عرض التقييمات
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState 
                title="لا توجد تقييمات"
                description="يرجى رفع ملف التقييمات المجمعة أولاً"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AssessmentsPage;
