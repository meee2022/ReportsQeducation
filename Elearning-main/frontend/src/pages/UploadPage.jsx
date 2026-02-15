import React, { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
    mutationName: "uploads:uploadStudentInteractionsCsv",
    icon: "💬",
  },
];

const FileUploadCard = ({ config, onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // Use the actual Convex mutation
  const uploadMutation = useMutation(config.mutationName);

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
      if (droppedFile.name.endsWith('.csv')) {
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

    setUploading(true);
    setUploadStatus(null);

    try {
      // Read file content
      const content = await file.text();
      
      // Call the Convex mutation
      const result = await uploadMutation({ content });
      
      setUploadStatus("success");
      setStatusMessage(`تم استيراد ${result.imported} صف بنجاح.`);
      toast.success(`تم استيراد ${result.imported} صف بنجاح`);
      
      if (onUploadComplete) {
        onUploadComplete(config.id);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      const errorMessage = error.message || "حدث خطأ أثناء رفع الملف";
      setStatusMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadStatus(null);
    setStatusMessage("");
  };

  return (
    <Card className={cn(
      "transition-all",
      dragActive && "border-primary ring-2 ring-primary/20",
      uploadStatus === "success" && "border-success/50 bg-success/5",
      uploadStatus === "error" && "border-destructive/50 bg-destructive/5"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div className="flex-1">
            <CardTitle className="text-base">{config.title}</CardTitle>
            <CardDescription className="mt-1">
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {config.filename}
              </code>
            </CardDescription>
            <p className="mt-2 text-xs text-muted-foreground">{config.description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "relative rounded-lg border-2 border-dashed p-4 text-center transition-colors",
            dragActive ? "border-primary bg-primary/5" : "border-muted",
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
                <span className="text-sm font-medium">{file.name}</span>
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

        {/* Upload Button */}
        <Button
          className="mt-4 w-full"
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جاري الرفع إلى Convex...
            </>
          ) : (
            <>
              <Upload className="ml-2 h-4 w-4" />
              رفع الملف
            </>
          )}
        </Button>

        {/* Status Message */}
        {statusMessage && (
          <div className={cn(
            "mt-4 flex items-center gap-2 rounded-lg p-3 text-sm",
            uploadStatus === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}>
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

  const handleUploadComplete = (fileId) => {
    setUploadedFiles(prev => [...prev, fileId]);
  };

  return (
    <AppLayout title="رفع الملفات">
      <div className="space-y-6">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">صفحة رفع البيانات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            قم برفع ملفات CSV لتحديث بيانات النظام. يجب أن تكون الملفات بصيغة CSV مع العناوين الصحيحة.
          </p>
          <p className="mt-1 text-xs text-primary font-medium">
            ✓ البيانات سترسل مباشرة إلى Convex
          </p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                تقدم الرفع: {uploadedFiles.length} من {uploadConfigs.length} ملفات
              </span>
              <div className="flex gap-1">
                {uploadConfigs.map((config) => (
                  <div
                    key={config.id}
                    className={cn(
                      "h-2 w-8 rounded-full",
                      uploadedFiles.includes(config.id) ? "bg-success" : "bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {uploadConfigs.map((config) => (
            <FileUploadCard
              key={config.id}
              config={config}
              onUploadComplete={handleUploadComplete}
            />
          ))}
        </div>

        {/* Instructions */}
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
              <li className="text-primary font-medium">البيانات ترسل مباشرة إلى قاعدة بيانات Convex</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default UploadPage;
