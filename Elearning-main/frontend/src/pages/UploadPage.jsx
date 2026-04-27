// هذه الصفحة ترفع البيانات مرتبطة بالمدرسة الحالية بناءً على currentSchoolId
import React, { useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { useCurrentSchool } from "@/utils/useCurrentSchool";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { AppLayout } from "@/components/layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";

/* إعدادات الملفات */
const uploadConfigs = [
  {
    id: "lessons",
    title: "ملف دروس المواد",
    filename: "ldrws-lmjm.csv",
    description: "ملف يحتوي على بيانات الدروس المجمعة لكل مادة",
    mutationName: "uploads:uploadLessonsCsv",
    icon: "📚",
  },
  {
    id: "assessments",
    title: "ملف تقييمات المواد",
    filename: "ltqyymt-lmjm.csv",
    description: "ملف يحتوي على بيانات التقييمات المجمعة",
    mutationName: "uploads:uploadAssessmentsCsv",
    icon: "📝",
  },
  {
    id: "studentLeaderboard",
    title: "ملف صدارة الطلاب",
    filename: "Sdr-lTlb.csv",
    description: "ملف يحتوي على ترتيب الطلاب في لوحة الصدارة",
    mutationName: "uploads:uploadStudentLeaderboardCsv",
    icon: "🏆",
  },
  {
    id: "teacherLeaderboard",
    title: "ملف صدارة المعلمين",
    filename: "Sdr-lm-lmyn.csv",
    description: "ملف يحتوي على ترتيب المعلمين في لوحة الصدارة",
    mutationName: "uploads:uploadTeacherLeaderboardCsv",
    icon: "👨‍🏫",
  },
  {
    id: "userActivity",
    title: "ملف نشاط المستخدمين",
    filename: "nshT-lTlb.csv",
    description: "ملف يحتوي على بيانات نشاط المستخدمين",
    mutationName: "uploads:uploadUserActivityCsv",
    icon: "📊",
  },
  {
    id: "studentInteractions",
    title: "ملف تفاعل الطلاب التفصيلي",
    filename: "tf-l-lTlb.csv",
    description: "ملف يحتوي على تفاصيل تفاعل الطلاب مع المحتوى",
    mutationName: "uploads:uploadStudentInteractionsBatch",
    batchMode: true,
    icon: "💬",
  },
  {
    id: "subjectsQuota",
    title: "ملف نصاب المواد",
    filename: "subjects_quota.csv",
    description: "ملف يحتوي على نصاب المواد لكل مرحلة ومسار ومستوى",
    mutationName: "subjectsQuota:upload",
    icon: "📘",
  },
  {
    id: "classTracks",
    title: "ملف مسارات الشعب",
    filename: "class_tracks.csv",
    description:
      "ملف يحدد المسار (عام / علمي / تكنولوجي / أدبي) لكل شعبة",
    mutationName: "classTracks:upload",
    icon: "📂",
  },
];

const FileUploadCard = ({ config, onUploadComplete, schoolId, portalUrl }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // "success" | "error"
  const [statusMessage, setStatusMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [batchProgress, setBatchProgress] = useState("");

  const uploadMutation = useMutation(config.mutationName);
  const clearInteractions = useMutation(
    api.uploads.clearStudentInteractions
  );

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".csv")) {
        setFile(droppedFile);
        setUploadStatus(null);
        setStatusMessage("");
      } else {
        toast.error("يرجى اختيار ملف CSV فقط");
      }
    }
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadStatus(null);
      setStatusMessage("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("يرجى اختيار ملف أولاً");
      return;
    }

    if (!schoolId) {
      toast.error("لا يمكن رفع الملفات قبل تحديد هوية المدرسة. يرجى إدخال اسم المدرسة وكود المدرسة من صفحة إعدادات المدرسة ثم المحاولة مرة أخرى.");
      return;
    }

    setUploading(true);
    setUploadStatus(null);
    setBatchProgress("");

    try {
      const content = await file.text();

      if (config.batchMode) {
        /* رفع تفاعل الطلاب على دفعات */
        const lines = content
          .split(/\r?\n/)
          .filter((l) => l.trim() !== "");
        if (lines.length < 2) {
          throw new Error("الملف فارغ أو لا يحتوي بيانات");
        }

        // 1) مسح البيانات القديمة (الدالة في Convex تحتاج تعديل لتعمل على دفعات)
        setBatchProgress("جارٍ مسح البيانات القديمة...");
        let clearResult = await clearInteractions({ schoolId });
        while (clearResult?.hasMore) {
          clearResult = await clearInteractions({ schoolId });
        }

        // 2) تقسيم الصفوف ورفعها
        const BATCH = 400;
        const dataLines = lines.slice(1);
        const totalRows = dataLines.length;
        let imported = 0;

        for (let start = 0; start < totalRows; start += BATCH) {
          const chunk = dataLines.slice(start, start + BATCH);
          const rows = chunk
            .filter((r) => r.trim())
            .map((row) => {
              const cols = row.split(",").map((c) => c.trim());
              return {
                lmsId: cols[0] ?? "",
                courseName: cols[1] ?? "",
                archived: cols[2] ?? "",
                sectionType: cols[3] ?? "",
                sectionName: cols[4] ?? "",
                firstName: cols[5] ?? "",
                lastName: cols[6] ?? "",
                totalTime: Number(cols[7] || 0),
                userAgent: cols[8] ?? "",
                schoolName: cols[9] ?? "",
              };
            });

          await uploadMutation({ rows, schoolId });
          imported += rows.length;
          setBatchProgress(
            `جارٍ الرفع... ${imported} / ${totalRows}`
          );
        }

        const msg = `تم استيراد ${imported} صف بنجاح.`;
        setUploadStatus("success");
        setStatusMessage(msg);
        setBatchProgress("");
        toast.success(msg);
      } else {
        /* رفع الملفات العادية */
        const result = await uploadMutation({ content, schoolId });
        const imported = result?.imported ?? 0;
        const msg = `تم استيراد ${imported} صف بنجاح.`;
        setUploadStatus("success");
        setStatusMessage(msg);
        toast.success(msg);
      }

      onUploadComplete?.(config.id);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      const errorMessage =
        error?.message || "حدث خطأ أثناء رفع الملف";
      setStatusMessage(errorMessage);
      setBatchProgress("");
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadStatus(null);
    setStatusMessage("");
    setBatchProgress("");
  };

  return (
    <Card
      className={cn(
        "transition-all",
        dragActive && "border-primary ring-2 ring-primary/20",
        uploadStatus === "success" &&
        "border-success/50 bg-success/5",
        uploadStatus === "error" &&
        "border-destructive/50 bg-destructive/5"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div className="flex-1">
            <CardTitle className="text-base">
              {config.title}
            </CardTitle>
            <CardDescription className="mt-1">
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {config.filename}
              </code>
            </CardDescription>
            <p className="mt-2 text-xs text-muted-foreground">
              {config.description}
            </p>
            {portalUrl && (
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                تحميل الملف من بوابة قطر للتعليم
              </a>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "relative rounded-lg border-2 border-dashed p-4 text-center transition-colors",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted",
            file && "border-solid"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">
                  {file.name}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetUpload}
                disabled={uploading}
              >
                تغيير
              </Button>
            </div>
          ) : (
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  اسحب الملف هنا أو انقر للاختيار
                </span>
              </div>
            </label>
          )}
        </div>

        <Button
          className="mt-4 w-full"
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              {batchProgress || "جاري الرفع إلى Convex..."}
            </>
          ) : (
            <>
              <Upload className="ml-2 h-4 w-4" />
              رفع الملف
            </>
          )}
        </Button>

        {statusMessage && (
          <div
            className={cn(
              "mt-4 flex items-center gap-2 rounded-lg p-3 text-sm",
              uploadStatus === "success"
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {uploadStatus === "success" ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const UploadPage = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [clearingLegacy, setClearingLegacy] = useState(false);
  const { schoolId } = useCurrentSchool();
  const clearLegacy = useMutation(api.uploads.clearLegacyData);
  const clearAllData = useMutation(api.uploads.clearAllSchoolData);
  const portalLinks = useQuery(api.myFunctions.getPortalLinks) || {};

  const handleClearLegacy = async () => {
    if (!window.confirm("هل تريد مسح جميع البيانات القديمة (غير المرتبطة بمدرسة)؟")) return;
    setClearingLegacy(true);
    const tables = ["lessonsAgg", "assessmentsAgg", "studentLeaderboards", "teacherLeaderboards", "userActivity"];
    try {
      for (const tableName of tables) {
        let hasMore = true;
        while (hasMore) {
          const result = await clearLegacy({ tableName });
          hasMore = result?.hasMore;
        }
      }
      // مسح تفاعل الطلاب القديم
      let hasMore = true;
      while (hasMore) {
        const result = await clearInteractions({ schoolId: undefined });
        hasMore = result?.hasMore;
      }
      toast.success("تم مسح البيانات القديمة بنجاح");
    } catch (e) {
      toast.error("حدث خطأ أثناء المسح: " + e.message);
    } finally {
      setClearingLegacy(false);
    }
  };

  const handleClearAll = async () => {
    if (!schoolId) { toast.error("يرجى تحديد كود المدرسة أولاً"); return; }
    if (!window.confirm(`سيتم مسح جميع بيانات مدرسة (${schoolId}) بالكامل. هل تريد المتابعة؟`)) return;
    setClearingLegacy(true);
    const tables = ["lessonsAgg", "assessmentsAgg", "studentLeaderboards", "teacherLeaderboards", "userActivity", "studentInteractions"];
    try {
      for (const tableName of tables) {
        let hasMore = true;
        while (hasMore) {
          const result = await clearAllData({ schoolId, tableName });
          hasMore = result?.hasMore ?? false;
        }
      }
      toast.success("تم مسح جميع البيانات بنجاح. يمكنك الآن إعادة رفع الملفات.");
    } catch (e) {
      toast.error("خطأ أثناء المسح: " + e.message);
    } finally {
      setClearingLegacy(false);
    }
  };

  const handleUploadComplete = (fileId) => {
    setUploadedFiles((prev) => [...prev, fileId]);
  };

  return (
    <AppLayout title="رفع الملفات">
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            صفحة رفع البيانات
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            قم برفع ملفات CSV لتحديث بيانات النظام. يجب أن تكون
            الملفات بصيغة CSV مع العناوين الصحيحة.
          </p>
          <p className="mt-1 text-xs text-primary font-medium">
            ✓ البيانات سترسل مباشرة إلى Convex
          </p>
          {schoolId ? (
            <div className="mt-2 rounded bg-green-50 p-3 border border-green-200">
              <p className="text-sm text-green-800 font-semibold">
                ✓ سيتم ربط جميع البيانات المرفوعة ومسح البيانات القديمة حصرياً لكود المدرسة الحالي: <strong className="bg-white px-1 rounded">{schoolId}</strong>
              </p>
              <p className="text-xs text-green-700 mt-1">يتم أخذ كود المدرسة من الإعدادات وليس من ملفات الـ CSV.</p>
            </div>
          ) : (
            <div className="mt-2 rounded bg-red-50 p-3 border border-red-200">
              <p className="text-sm text-red-800 font-semibold">
                ⚠ لا يمكن رفع الملفات قبل تحديد هوية المدرسة. يرجى إدخال اسم وكود المدرسة من صفحة الإعدادات أولاً.
              </p>
            </div>
          )}
          {schoolId && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearLegacy}
                disabled={clearingLegacy}
                className="border-orange-400 text-orange-600 hover:bg-orange-50"
              >
                {clearingLegacy ? <><Loader2 className="ml-2 h-3 w-3 animate-spin" />جارٍ المسح...</> : "🗑 مسح البيانات القديمة (بدون مدرسة)"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={clearingLegacy}
                className="border-red-600 text-red-700 hover:bg-red-50"
              >
                {clearingLegacy ? <><Loader2 className="ml-2 h-3 w-3 animate-spin" />جارٍ المسح...</> : "⚠ مسح كل البيانات وإعادة الرفع"}
              </Button>
            </div>
          )}
        </div>

        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                تقدم الرفع: {uploadedFiles.length} من{" "}
                {uploadConfigs.length} ملفات
              </span>
              <div className="flex gap-1">
                {uploadConfigs.map((config) => (
                  <div
                    key={config.id}
                    className={cn(
                      "h-2 w-8 rounded-full",
                      uploadedFiles.includes(config.id)
                        ? "bg-success"
                        : "bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {uploadConfigs.map((config) => (
            <FileUploadCard
              key={config.id}
              config={config}
              onUploadComplete={handleUploadComplete}
              schoolId={schoolId}
              portalUrl={portalLinks[config.id]}
            />
          ))}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>تعليمات الرفع</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
              <li>تأكد من أن جميع الملفات بصيغة CSV</li>
              <li>يجب أن تحتوي الملفات على صف العناوين في الأعلى</li>
              <li>تأكد من تطابق أسماء الأعمدة مع المتوقع</li>
              <li>في حالة وجود أخطاء، سيتم عرض رسالة الخطأ مع التفاصيل</li>
              <li>يمكنك رفع نفس الملف عدة مرات لتحديث البيانات</li>
              <li className="text-primary font-medium">
                البيانات ترسل مباشرة إلى قاعدة بيانات Convex
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default UploadPage;
