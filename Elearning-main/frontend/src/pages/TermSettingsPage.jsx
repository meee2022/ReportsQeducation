// هذه الصفحة تعرض إعدادات الفصل الدراسي ويمكن ضبط هوية المدرسة الحالية منها
import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppLayout } from "@/components/layout";
import { Trash2 } from "lucide-react";
import { useCurrentSchool } from "@/utils/useCurrentSchool";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const TRACK_OPTIONS = ["علمي", "تكنولوجي", "أدبي", "عام"];

const TermSettingsPage = () => {
  const { schoolId, schoolName, setSchool, clearSchool } = useCurrentSchool();

  const terms       = useQuery(api.terms.list)                                   || [];
  const subjects    = useQuery(api.subjectsQuota.list, { schoolId })             || [];
  const classTracks = useQuery(api.classTracks.list,   { schoolId })             || [];
  const currentPassword = useQuery(api.myFunctions.getSitePassword)              || "123";

  const upsertTerm        = useMutation(api.terms.upsert);
  const updateQuota       = useMutation(api.subjectsQuota.updateQuota);
  const updateSubjectName = useMutation(api.subjectsQuota.updateSubjectName);
  const addSubject        = useMutation(api.subjectsQuota.addSubject);
  const deleteSubject     = useMutation(api.subjectsQuota.deleteSubject);
  const seedSecondary     = useMutation(api.subjectsQuota.saveAsTemplate);
  const loadTemplate      = useMutation(api.subjectsQuota.loadFromTemplate);
  const templateInfo      = useQuery(api.subjectsQuota.getTemplateInfo);
  const addTrack          = useMutation(api.classTracks.addTrack);
  const updateTrack       = useMutation(api.classTracks.updateTrack);
  const removeTrack       = useMutation(api.classTracks.removeTrack);
  const saveTracksTemplate   = useMutation(api.classTracks.saveAsTemplate);
  const loadTracksTemplate   = useMutation(api.classTracks.loadFromTemplate);
  const tracksTemplateInfo   = useQuery(api.classTracks.getTemplateInfo);
  const updatePassword       = useMutation(api.myFunctions.updateSitePassword);

  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [seedingTracks, setSeedingTracks] = useState(false);

  const [seedingDefaults, setSeedingDefaults] = useState(false);

  // نموذج إضافة/تعديل فصل
  const [editingTermId, setEditingTermId]         = useState(null);
  const [name, setName]                           = useState("");
  const [code, setCode]                           = useState("");
  const [startDate, setStartDate]                 = useState("");
  const [endDate, setEndDate]                     = useState("");
  const [active, setActive]                       = useState(false);
  const [termSchoolName, setTermSchoolName]       = useState("");
  const [principalName, setPrincipalName]         = useState("");
  const [viceNames, setViceNames]                 = useState("");
  const [coordinatorName, setCoordinatorName]     = useState("");

  // نموذج إضافة مادة جديدة
  const [newStage, setNewStage]     = useState("");
  const [newTrack, setNewTrack]     = useState("");
  const [newGrade, setNewGrade]     = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newQuota, setNewQuota]     = useState(0);

  // فلاتر نصاب المواد
  const [stageFilter, setStageFilter] = useState("all");
  const [trackFilter, setTrackFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");

  // نموذج إضافة مسار صف جديد
  const [ctGrade, setCtGrade]         = useState("");
  const [ctClassName, setCtClassName] = useState("");
  const [ctTrack, setCtTrack]         = useState("");
  const [ctGradeFilter, setCtGradeFilter] = useState("all");

  const handleSaveTracksTemplate = async () => {
    if (!schoolId) { alert("يرجى تحديد كود المدرسة أولاً"); return; }
    if (!window.confirm(`سيتم حفظ مسارات شعب مدرستك (${schoolId}) كقالب مشترك. هل تريد المتابعة؟`)) return;
    setSeedingTracks(true);
    try {
      const result = await saveTracksTemplate({ sourceSchoolId: schoolId });
      alert(`تم حفظ ${result.saved} شعبة كقالب مشترك بنجاح.`);
    } catch (e) { alert("خطأ: " + e.message); }
    finally { setSeedingTracks(false); }
  };

  const handleLoadTracksTemplate = async (overwrite = false) => {
    if (!schoolId) { alert("يرجى تحديد كود المدرسة أولاً"); return; }
    if (overwrite && !window.confirm("سيتم استبدال مسارات الشعب الحالية بالقالب. هل تريد المتابعة؟")) return;
    setSeedingTracks(true);
    try {
      const result = await loadTracksTemplate({ targetSchoolId: schoolId, overwrite });
      alert(`تم استيراد ${result.added} شعبة من القالب (${result.total} إجمالاً).`);
    } catch (e) { alert("خطأ: " + e.message); }
    finally { setSeedingTracks(false); }
  };

  const handleSeedSecondary = async (overwrite = false) => {
    if (!schoolId) { alert("يرجى تحديد كود المدرسة أولاً"); return; }
    if (!window.confirm(`سيتم حفظ نصاب مدرستك الحالية (${schoolId}) كقالب مشترك يمكن استخدامه من أي مدرسة ثانوية. هل تريد المتابعة؟`)) return;
    setSeedingDefaults(true);
    try {
      const result = await seedSecondary({ sourceSchoolId: schoolId });
      alert(`تم حفظ ${result.saved} مادة كقالب مشترك بنجاح. يمكن الآن لأي مدرسة ثانوية استيراد هذا القالب.`);
    } catch (e) {
      alert("خطأ: " + e.message);
    } finally {
      setSeedingDefaults(false);
    }
  };

  const handleLoadTemplate = async (overwrite = false) => {
    if (!schoolId) { alert("يرجى تحديد كود المدرسة أولاً"); return; }
    if (overwrite && !window.confirm("سيتم استبدال نصاب المواد الحالي بالقالب المشترك. هل تريد المتابعة؟")) return;
    setSeedingDefaults(true);
    try {
      const result = await loadTemplate({ targetSchoolId: schoolId, overwrite });
      alert(`تم استيراد ${result.added} مادة من القالب (${result.total} مادة إجمالاً).`);
    } catch (e) {
      alert("خطأ: " + e.message);
    } finally {
      setSeedingDefaults(false);
    }
  };

  const handleSaveTerm = async (e) => {
    if (!name || !code || !startDate || !endDate) return;
    await upsertTerm({
      ...(editingTermId ? { id: editingTermId } : {}),
      name, code, startDate, endDate, active,
      schoolName: termSchoolName, principalName, viceNames, coordinatorName,
    });
    setEditingTermId(null);
    setName(""); setCode(""); setStartDate(""); setEndDate(""); setActive(false);
    setTermSchoolName(""); setPrincipalName(""); setViceNames(""); setCoordinatorName("");
  };

  const handleEditTerm = (t) => {
    setEditingTermId(t._id);
    setName(t.name          || "");
    setCode(t.code          || "");
    setStartDate(t.startDate || "");
    setEndDate(t.endDate     || "");
    setActive(t.active       || false);
    setTermSchoolName(t.schoolName      || "");
    setPrincipalName(t.principalName || "");
    setViceNames(t.viceNames        || "");
    setCoordinatorName(t.coordinatorName || "");
  };

  const handleSetActive = async (term) => {
    await upsertTerm({
      id: term._id,
      name: term.name, code: term.code,
      startDate: term.startDate, endDate: term.endDate,
      active: true,
      schoolName:      term.schoolName      || "",
      principalName:   term.principalName   || "",
      viceNames:       term.viceNames       || "",
      coordinatorName: term.coordinatorName || "",
    });
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newStage || !newTrack || !newGrade || !newSubject) return;
    await addSubject({ stage: newStage, track: newTrack, grade: newGrade, subjectName: newSubject, weeklyQuota: newQuota });
    setNewStage(""); setNewTrack(""); setNewGrade(""); setNewSubject(""); setNewQuota(0);
  };

  const handleDeleteSubject = async (id) => {
    if (confirm("هل أنت متأكد من حذف هذه المادة؟")) {
      await deleteSubject({ id });
    }
  };

  const handleAddTrack = async (e) => {
    e.preventDefault();
    if (!ctGrade || !ctClassName || !ctTrack) return;
    await addTrack({ grade: ctGrade.trim(), className: ctClassName.trim(), track: ctTrack });
    setCtGrade(""); setCtClassName(""); setCtTrack("");
  };

  const handleRemoveTrack = async (id) => {
    if (confirm("هل أنت متأكد من حذف هذا المسار؟")) {
      await removeTrack({ id });
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPasswordInput.trim()) return;
    setIsChangingPassword(true);
    try {
      await updatePassword({ newPassword: newPasswordInput.trim() });
      alert("✓ تم تغيير كلمة مرور الموقع بنجاح");
      setNewPasswordInput("");
    } catch (e) {
      alert("خطأ في التغيير: " + e.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ── ضبط المدرسة ──
  const [inputSchoolId, setInputSchoolId]     = useState(schoolId || "");
  const [inputSchoolName, setInputSchoolName] = useState(schoolName || "");

  const handleSaveSchool = (e) => {
    e.preventDefault();
    if (!inputSchoolId.trim()) return alert("يرجى إدخال كود المدرسة");
    setSchool(inputSchoolId.trim(), inputSchoolName.trim());
    alert("✓ تم حفظ إعدادات المدرسة");
  };

  const filteredSubjects = subjects
    .filter((s) => stageFilter === "all" || s.stage === stageFilter)
    .filter((s) => trackFilter === "all" || s.track === trackFilter)
    .filter((s) => gradeFilter === "all" || s.grade === gradeFilter);

  const stages = [...new Set(subjects.map((s) => s.stage))].filter(Boolean);
  const tracks = [...new Set(subjects.map((s) => s.track))].filter(Boolean);
  const grades = [...new Set(subjects.map((s) => s.grade))].filter(Boolean);

  const ctGrades = [...new Set(classTracks.map((r) => r.grade))].filter(Boolean).sort();
  const filteredTracks = classTracks
    .filter((r) => ctGradeFilter === "all" || r.grade === ctGradeFilter)
    .sort((a, b) => {
      const ga = Number(a.grade) || 0, gb = Number(b.grade) || 0;
      if (ga !== gb) return ga - gb;
      return a.className.localeCompare(b.className, "ar");
    });

  const trackColor = (t) => {
    if (t === "علمي")       return "#16a34a";
    if (t === "تكنولوجي")   return "#2563eb";
    if (t === "أدبي")       return "#9333ea";
    return "#6b7280";
  };

  return (
    <AppLayout title="إعدادات الفصل">
      <div className="space-y-6" dir="rtl">
        <Tabs defaultValue="subjects" className="w-full" dir="rtl">
          <TabsList className="mb-4">
            <TabsTrigger value="school">إعدادات المدرسة</TabsTrigger>
            <TabsTrigger value="subjects">نصاب المواد</TabsTrigger>
            <TabsTrigger value="classtracks">مسارات الشعب</TabsTrigger>
            <TabsTrigger value="term">إعدادات الفصل الدراسي</TabsTrigger>
            <TabsTrigger value="security">الأمان</TabsTrigger>
            <TabsTrigger value="reference">حسابات مرجعية</TabsTrigger>
          </TabsList>

          {/* ══════ تبويب إعدادات المدرسة ══════ */}
          <TabsContent value="school" className="space-y-4" dir="rtl">
            <Card>
              <CardHeader>
                <CardTitle>هوية المدرسة الحالية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {schoolId ? (
                  <div className="rounded border border-green-300 bg-green-50 p-4 text-right">
                    <p className="text-sm font-semibold text-green-800">المدرسة الحالية المفعّلة:</p>
                    <p className="mt-1 text-lg font-bold">{schoolName || schoolId}</p>
                    <p className="text-xs text-muted-foreground mt-1">الكود: <code>{schoolId}</code></p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => { clearSchool(); setInputSchoolId(""); setInputSchoolName(""); }}>
                      تغيير المدرسة
                    </Button>
                  </div>
                ) : (
                  <div className="rounded border border-amber-300 bg-amber-50 p-3 text-right text-sm text-amber-800">
                    ⚠ لم يتم تحديد مدرسة بعد — جميع البيانات ستظهر بدون فلترة. يرجى إدخال كود المدرسة أدناه.
                  </div>
                )}

                <form onSubmit={handleSaveSchool} className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="block text-sm mb-1 text-right font-medium">كود المدرسة <span className="text-red-500">*</span></label>
                    <Input
                      value={inputSchoolId}
                      onChange={(e) => setInputSchoolId(e.target.value)}
                      placeholder="ibn_taymiyyah_sec_boys"
                      className="text-left ltr"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-right">مثال: ibn_taymiyyah_sec_boys — يجب أن يطابق الكود المستخدم في رفع البيانات</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-right font-medium">اسم المدرسة</label>
                    <Input
                      value={inputSchoolName}
                      onChange={(e) => setInputSchoolName(e.target.value)}
                      placeholder="ابن تيمية الثانوية للبنين"
                      className="text-right"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" className="w-full">حفظ وتفعيل</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب نصاب المواد */}
          <TabsContent value="subjects" className="space-y-4" dir="rtl">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle>نصاب المواد حسب المرحلة / المسار / الصف</CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSeedSecondary}
                      disabled={seedingDefaults}
                      className="border-green-500 text-green-700 hover:bg-green-50 text-xs"
                    >
                      {seedingDefaults ? "جارٍ الحفظ..." : "💾 حفظ كقالب مشترك للثانوي"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLoadTemplate(false)}
                      disabled={seedingDefaults || !templateInfo?.exists}
                      className="border-blue-400 text-blue-700 hover:bg-blue-50 text-xs"
                      title={!templateInfo?.exists ? "لا يوجد قالب محفوظ بعد" : `القالب يحتوي ${templateInfo.count} مادة`}
                    >
                      {seedingDefaults ? "جارٍ الاستيراد..." : `📥 استيراد من القالب${templateInfo?.exists ? ` (${templateInfo.count})` : " ⚠"}`}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLoadTemplate(true)}
                      disabled={seedingDefaults || !templateInfo?.exists}
                      className="border-orange-400 text-orange-700 hover:bg-orange-50 text-xs"
                    >
                      {seedingDefaults ? "جارٍ الاستيراد..." : "🔄 استبدال بالقالب"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* فلاتر */}
                <div className="flex flex-wrap gap-3 items-center justify-end">
                  <Select value={stageFilter} onValueChange={setStageFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="المرحلة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المراحل</SelectItem>
                      {stages.map((st) => (
                        <SelectItem key={st} value={st}>{st}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={trackFilter} onValueChange={setTrackFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="المسار" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المسارات</SelectItem>
                      {tracks.map((tr) => (
                        <SelectItem key={tr} value={tr}>{tr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="الصف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الصفوف</SelectItem>
                      {grades.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* نموذج إضافة مادة جديدة */}
                <Card className="bg-muted/20">
                  <CardHeader>
                    <CardTitle className="text-base">إضافة مادة جديدة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddSubject} className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
                      <div>
                        <label className="block text-sm mb-1 text-right">المرحلة</label>
                        <Input value={newStage} onChange={(e) => setNewStage(e.target.value)} placeholder="ابتدائية" className="text-right h-9" required />
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-right">المسار</label>
                        <Input value={newTrack} onChange={(e) => setNewTrack(e.target.value)} placeholder="عام" className="text-right h-9" required />
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-right">الصف</label>
                        <Input value={newGrade} onChange={(e) => setNewGrade(e.target.value)} placeholder="الأول" className="text-right h-9" required />
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-right">اسم المادة</label>
                        <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="الرياضيات" className="text-right h-9" required />
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-right">النصاب الأسبوعي</label>
                        <Input type="number" min={0} value={newQuota} onChange={(e) => setNewQuota(Number(e.target.value))} className="text-center h-9" required />
                      </div>
                      <div className="flex items-end">
                        <Button type="submit" className="w-full h-9">إضافة</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* جدول المواد */}
                <div className="overflow-x-auto rounded border bg-card mt-2" dir="rtl">
                  <Table className="text-sm">
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-right">المرحلة</TableHead>
                        <TableHead className="text-right">المسار</TableHead>
                        <TableHead className="text-right">الصف</TableHead>
                        <TableHead className="text-right">
                          المادة <span className="text-xs text-muted-foreground mr-1">(قابل للتعديل)</span>
                        </TableHead>
                        <TableHead className="text-right">النصاب الأسبوعي</TableHead>
                        <TableHead className="text-right">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubjects.map((row) => (
                        <TableRow key={row._id}>
                          <TableCell className="text-right">{row.stage}</TableCell>
                          <TableCell className="text-right">{row.track}</TableCell>
                          <TableCell className="text-right">{row.grade}</TableCell>
                          <TableCell className="text-right min-w-[200px]">
                            <Input
                              defaultValue={row.subjectName}
                              onBlur={async (e) => {
                                const value = e.target.value.trim();
                                if (value === row.subjectName || !value) return;
                                await updateSubjectName({ id: row._id, subjectName: value });
                              }}
                              className="h-8 text-right"
                              placeholder="اسم المادة"
                            />
                          </TableCell>
                          <TableCell className="w-32">
                            <div className="flex items-center gap-2 justify-end flex-row-reverse">
                              <span className="text-xs text-muted-foreground">حصة/أسبوع</span>
                              <Input
                                type="number"
                                min={0}
                                defaultValue={row.weeklyQuota}
                                onBlur={async (e) => {
                                  const value = Number(e.target.value || 0);
                                  if (value === row.weeklyQuota) return;
                                  await updateQuota({ id: row._id, weeklyQuota: value });
                                }}
                                className="h-8 w-20 text-center"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteSubject(row._id)}>
                              <Trash2 className="h-4 w-4 ml-1" />
                              حذف
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredSubjects.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            لا توجد مواد مطابقة للفلاتر الحالية
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════ تبويب مسارات الشعب ══════ */}
          <TabsContent value="classtracks" className="space-y-4" dir="rtl">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle>مسارات الشعب (علمي / تكنولوجي / أدبي)</CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={handleSaveTracksTemplate}
                      disabled={seedingTracks}
                      className="border-green-500 text-green-700 hover:bg-green-50 text-xs">
                      {seedingTracks ? "جارٍ الحفظ..." : "💾 حفظ كقالب مشترك"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleLoadTracksTemplate(false)}
                      disabled={seedingTracks || !tracksTemplateInfo?.exists}
                      className="border-blue-400 text-blue-700 hover:bg-blue-50 text-xs"
                      title={!tracksTemplateInfo?.exists ? "لا يوجد قالب محفوظ" : `القالب يحتوي ${tracksTemplateInfo.count} شعبة`}>
                      {seedingTracks ? "جارٍ الاستيراد..." : `📥 استيراد من القالب${tracksTemplateInfo?.exists ? ` (${tracksTemplateInfo.count})` : " ⚠"}`}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleLoadTracksTemplate(true)}
                      disabled={seedingTracks || !tracksTemplateInfo?.exists}
                      className="border-orange-400 text-orange-700 hover:bg-orange-50 text-xs">
                      {seedingTracks ? "جارٍ الاستيراد..." : "🔄 استبدال بالقالب"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground text-right">
                  حدد المسار لكل شعبة حتى يُحتسب النصاب الصحيح في التقارير. مثال: الصف 11 شعبة 4 = تكنولوجي.
                </p>

                {/* نموذج إضافة */}
                <Card className="bg-muted/20">
                  <CardHeader>
                    <CardTitle className="text-base">إضافة / تحديث مسار شعبة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddTrack} className="grid gap-3 md:grid-cols-4">
                      <div>
                        <label className="block text-sm mb-1 text-right">الصف (رقم)</label>
                        <Input value={ctGrade} onChange={(e) => setCtGrade(e.target.value)} placeholder="11" className="text-right h-9" required />
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-right">اسم الشعبة</label>
                        <Input value={ctClassName} onChange={(e) => setCtClassName(e.target.value)} placeholder="11-4" className="text-right h-9" required />
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-right">المسار</label>
                        <Select value={ctTrack} onValueChange={setCtTrack} required>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="اختر المسار" />
                          </SelectTrigger>
                          <SelectContent>
                            {TRACK_OPTIONS.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button type="submit" className="w-full h-9">حفظ</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* فلتر الصف */}
                <div className="flex justify-end">
                  <Select value={ctGradeFilter} onValueChange={setCtGradeFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="فلتر الصف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الصفوف</SelectItem>
                      {ctGrades.map((g) => (
                        <SelectItem key={g} value={g}>الصف {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* جدول المسارات */}
                <div className="overflow-x-auto rounded border bg-card" dir="rtl">
                  <Table className="text-sm">
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-right w-12">#</TableHead>
                        <TableHead className="text-right">الصف</TableHead>
                        <TableHead className="text-right">الشعبة</TableHead>
                        <TableHead className="text-right">المسار</TableHead>
                        <TableHead className="text-right">تعديل المسار</TableHead>
                        <TableHead className="text-right">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTracks.map((row, i) => (
                        <TableRow key={row._id}>
                          <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="text-right font-medium">{row.grade}</TableCell>
                          <TableCell className="text-right">{row.className}</TableCell>
                          <TableCell className="text-right">
                            <span
                              className="inline-block px-2 py-0.5 rounded text-white text-xs font-bold"
                              style={{ background: trackColor(row.track) }}
                            >
                              {row.track}
                            </span>
                          </TableCell>
                          <TableCell className="w-44">
                            <Select
                              defaultValue={row.track}
                              onValueChange={async (val) => {
                                if (val !== row.track) {
                                  await updateTrack({ id: row._id, track: val });
                                }
                              }}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TRACK_OPTIONS.map((t) => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="destructive" size="sm" onClick={() => handleRemoveTrack(row._id)}>
                              <Trash2 className="h-4 w-4 ml-1" />
                              حذف
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredTracks.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            لا توجد مسارات محددة بعد
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب إعدادات الفصل الدراسي */}
          <TabsContent value="term" className="space-y-4" dir="rtl">
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingTermId ? "تعديل فصل دراسي" : "إضافة فصل دراسي جديد"}
                  {editingTermId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTermId(null);
                        setName(""); setCode(""); setStartDate(""); setEndDate(""); setActive(false);
                        setTermSchoolName(""); setPrincipalName(""); setViceNames(""); setCoordinatorName("");
                      }}
                      className="mr-3 text-sm font-normal text-muted-foreground underline"
                    >
                      إلغاء التعديل
                    </button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editingTermId && (
                  <div className="mb-3 rounded bg-amber-50 border border-amber-300 px-3 py-2 text-sm text-amber-800 text-right">
                    أنت تُعدّل فصلاً موجوداً — سيتم تحديث بياناته عند الحفظ.
                  </div>
                )}
                <form onSubmit={handleSaveTerm} className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="block text-sm mb-1 text-right">اسم الفصل</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="الفصل الثاني 2025–2026" className="text-right" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-right">الكود</label>
                    <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="term2_2025_2026" className="text-right" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-right">تاريخ البداية</label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-right" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-right">تاريخ النهاية</label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-right" />
                  </div>
                  <label className="flex items-center gap-2 text-sm mt-2 flex-row-reverse justify-end">
                    <span>اجعل هذا الفصل هو الحالي (active)</span>
                    <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                  </label>

                  {/* ── بيانات المدرسة والإدارة ── */}
                  <div className="mt-4 border-t pt-4">
                    <p className="text-sm font-semibold text-right mb-3 text-primary">بيانات المدرسة والإدارة (تظهر في التقارير)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm mb-1 text-right">اسم المدرسة</label>
                        <Input value={termSchoolName} onChange={e => setTermSchoolName(e.target.value)} placeholder="ابن تيمية الثانوية للبنين" className="text-right" />
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-right">اسم المدير/ة</label>
                        <Input value={principalName} onChange={e => setPrincipalName(e.target.value)} placeholder="محمد إبراهيم محمد" className="text-right" />
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-right">اسم النائب الأكاديمي</label>
                        <Input value={viceNames} onChange={e => setViceNames(e.target.value)} placeholder="أبوبكر فضل العبيد" className="text-right" />
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-right">اسم منسق المشاريع الإلكترونية</label>
                        <Input value={coordinatorName} onChange={e => setCoordinatorName(e.target.value)} placeholder="اسم المنسق" className="text-right" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button type="submit">{editingTermId ? "تحديث الفصل" : "حفظ"}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الفصول المسجلة</CardTitle>
              </CardHeader>
              <CardContent>
                {terms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا توجد فصول بعد، أضف فصل جديد من النموذج بالأعلى.</p>
                ) : (
                  <div className="overflow-x-auto rounded border bg-card" dir="rtl">
                    <Table className="text-sm">
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="text-right">الاسم</TableHead>
                          <TableHead className="text-right">الكود</TableHead>
                          <TableHead className="text-right">البداية</TableHead>
                          <TableHead className="text-right">النهاية</TableHead>
                          <TableHead className="text-right">حالي؟</TableHead>
                          <TableHead className="text-right">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {terms.map((t) => (
                          <TableRow key={t._id} className={editingTermId === t._id ? "bg-amber-50" : ""}>
                            <TableCell className="text-right">{t.name}</TableCell>
                            <TableCell className="text-right">{t.code}</TableCell>
                            <TableCell className="text-right">{t.startDate}</TableCell>
                            <TableCell className="text-right">{t.endDate}</TableCell>
                            <TableCell className="text-right">{t.active ? "نعم" : "لا"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end flex-row-reverse">
                                <Button size="sm" variant="outline" onClick={() => handleEditTerm(t)}>
                                  تعديل
                                </Button>
                                {!t.active && (
                                  <Button size="sm" variant="ghost" onClick={() => handleSetActive(t)}>
                                    جعله الحالي
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* ══════ تبويب الأمان ══════ */}
          <TabsContent value="security" className="space-y-4" dir="rtl">
            <Card>
              <CardHeader>
                <CardTitle>حماية الموقع</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded border border-blue-200 bg-blue-50 p-4 text-right">
                  <p className="text-sm font-semibold text-blue-800">كلمة المرور الحالية:</p>
                  <p className="mt-1 text-lg font-bold tracking-widest">{currentPassword}</p>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="max-w-md">
                    <label className="block text-sm mb-2 text-right font-medium">تغيير كلمة المرور</label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="كلمة المرور الجديدة"
                        className="text-right"
                        required
                      />
                      <Button type="submit" disabled={isChangingPassword}>
                        {isChangingPassword ? "جارٍ الحفظ..." : "تحديث"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-right">
                      * سيتم طلب كلمة المرور الجديدة من المستخدمين عند فتح الموقع مرة أخرى.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* تبويب الحسابات المرجعية */}
          <TabsContent value="reference" dir="rtl">
            <Card>
              <CardHeader>
                <CardTitle>حسابات نصاب المعلمين (قريبًا)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-right">
                  لاحقًا هنستخدم نصاب المواد + عدد أسابيع الفصل لحساب عدد الدروس المتوقع لكل مادة حتى أسبوع معيّن.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default TermSettingsPage;
