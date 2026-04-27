import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ===================== تحميل وتسجيل خط Amiri ===================== */

// متغيرات خاصة بالخط
let arabicFontBase64: string | null = null;
let fontLoadingAttempted = false;

/**
 * تحميل الخط Amiri من ملف Base64 في:
 * public/assets/fonts/amiri-regular-base64.txt
 */
const loadArabicFont = async () => {
  if (fontLoadingAttempted) return arabicFontBase64;
  fontLoadingAttempted = true;

  try {
    const response = await fetch("/assets/fonts/amiri-regular-base64.txt");
    if (!response.ok) {
      console.warn("فشل تحميل الخط العربي، status:", response.status);
      return null;
    }

    const text = await response.text();
    arabicFontBase64 = text.replace(/\s+/g, "").trim();
    console.log("Arabic font base64 size:", arabicFontBase64.length);
    return arabicFontBase64;
  } catch (e) {
    console.error("فشل تحميل الخط العربي:", e);
    return null;
  }
};

/**
 * تسجيل الخط Amiri في jsPDF واختياره كخط افتراضي
 */
const addArabicFont = (doc: jsPDF): boolean => {
  try {
    if (!arabicFontBase64) {
      console.warn("arabicFontBase64 غير محمّل");
      return false;
    }

    const fonts = doc.getFontList();
    if (!fonts["Amiri"]) {
      doc.addFileToVFS("Amiri-Regular.ttf", arabicFontBase64);
      doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
    }

    doc.setFont("Amiri", "normal");
    console.log("Arabic font (Amiri) registered in jsPDF");
    return true;
  } catch (error) {
    console.error("فشل تسجيل الخط في jsPDF:", error);
    return false;
  }
};

// دالة مساعدة لتنسيق الأرقام بالإنجليزي
const toAr = (n: any) => Number(n || 0).toLocaleString("en-US");

/* ===================== تقرير المعلم ===================== */

export const printTeacherReport = async (
  teacher: any,
  classes: any[],
  effectiveWeeks = 0,
  schoolNameOverride = ""
) => {
  // تحميل الخط أولاً
  const fontData = await loadArabicFont();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let fontName = "helvetica";

  if (fontData) {
    const ok = addArabicFont(doc);
    if (ok) fontName = "Amiri";
  } else {
    console.warn("لم يتم تحميل الخط، سيتم استخدام helvetica");
  }

  // تثبيت الخط الافتراضي قبل أي نص
  doc.setFont(fontName, "normal");

  // العنوان الرئيسي
  doc.setFontSize(18);
  doc.text("تقرير أداء المعلم", 105, 15, { align: "center" });

  // اسم المدرسة فوق إن وُجد
  const displaySchool = schoolNameOverride || teacher.schoolName || "";
  if (displaySchool) {
    doc.setFontSize(12);
    doc.text(displaySchool, 105, 23, { align: "center" });
  }

  // معلومات المعلم
  doc.setFontSize(11);
  let y = 40;

  const info: string[] = [
    `اسم المعلم: ${teacher.teacherName || "-"}`,
    `المدرسة: ${teacher.schoolName || "-"}`,
    `النصاب الأسبوعي: ${toAr(teacher.weeklyQuotaTotal || 0)}`,
    `الأسابيع المحسوبة: ${toAr(effectiveWeeks)}`,
    `المطلوب الكلي: ${toAr(teacher.requiredLessonsTotal || 0)}`,
    `المرفوع الكلي: ${toAr(teacher.totalLessons || 0)}`,
    `المتبقي: ${toAr(teacher.remaining || 0)}`,
    `نسبة المخرجات: ${teacher.outcomesRatio || 0}%`,
    `عدد الصفوف: ${toAr(teacher.classesCount || 0)}`,
  ];

  if (teacher.lastLessonDate) {
    info.push(`آخر درس: ${teacher.lastLessonDate}`);
  }

  info.forEach((line) => {
    doc.text(line, 190, y, { align: "right" });
    y += 7;
  });

  y += 10;

  // عنوان الجدول
  doc.setFontSize(13);
  doc.text("تفاصيل الصفوف والشعب", 105, y, { align: "center" });
  y += 8;

  // بيانات الجدول
  const tableData = classes.map((c) => {
    const outcomesRatio =
      c.totalLessons > 0
        ? Math.round((c.lessonsWithOutcomes / c.totalLessons) * 100)
        : 0;
    const remaining =
      c.requiredLessons > 0
        ? Math.max(0, c.requiredLessons - c.totalLessons)
        : 0;

    return [
      c.subjectName || "-",
      c.grade || "-",
      c.section || "-",
      c.track || "-",
      toAr(c.weeklyQuota || 0),
      toAr(c.requiredLessons || 0),
      toAr(c.totalLessons || 0),
      toAr(remaining),
      `${outcomesRatio}%`,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [
      [
        "المادة",
        "الصف",
        "الشعبة",
        "المسار",
        "نصاب/أسبوع",
        "المطلوب",
        "المرفوع",
        "المتبقي",
        "نسبة المخرجات",
      ],
    ],
    body: tableData,
    styles: {
      font: fontName,
      fontSize: 9,
      halign: "center",
      cellPadding: 2,
    },
    headStyles: {
      font: fontName,
      fillColor: [93, 63, 106],
      textColor: 255,
      fontStyle: "normal",
      halign: "center",
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { top: 10, left: 10, right: 10 },
    tableWidth: "auto",
  });

  // تاريخ التقرير
  const date = new Date().toLocaleDateString("en-US");
  doc.setFontSize(9);
  const pageHeight = doc.internal.pageSize.height;
  doc.text(`تاريخ الطباعة: ${date}`, 190, pageHeight - 10, {
    align: "right",
  });

  doc.save(`تقرير-معلم-${teacher.teacherName}.pdf`);
};

/* ===================== تقرير القسم ===================== */

export const printDepartmentReport = async (
  filteredTeachers: any[],
  filters: any,
  stats: any,
  effectiveWeeks = 0
) => {
  // تحميل الخط أولاً
  const fontData = await loadArabicFont();

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  let fontName = "helvetica";

  if (fontData) {
    const ok = addArabicFont(doc);
    if (ok) fontName = "Amiri";
  } else {
    console.warn("لم يتم تحميل الخط، سيتم استخدام helvetica");
  }

  // تثبيت الخط الافتراضي
  doc.setFont(fontName, "normal");

  // العنوان
  doc.setFontSize(18);
  doc.text("تقرير أداء المعلمين - القسم", 148, 20, { align: "center" });

  // جملة اختبارية للتأكد من الخط
  doc.setFontSize(12);
  doc.text("تجربة الخط العربي Amiri", 148, 28, { align: "center" });

  // الفلاتر
  doc.setFontSize(10);
  let y = 35;

  const filterText: string[] = [];
  if (filters.school && filters.school !== "all")
    filterText.push(`المدرسة: ${filters.school}`);
  if (filters.subject && filters.subject !== "all")
    filterText.push(`المادة: ${filters.subject}`);
  if (filters.grade && filters.grade !== "all")
    filterText.push(`الصف: ${filters.grade}`);

  if (filterText.length > 0) {
    doc.text(`الفلاتر المطبقة: ${filterText.join(" | ")}`, 280, y, {
      align: "right",
    });
    y += 8;
  }

  // إحصائيات عامة
  const summaryLines: string[] = [
    `عدد المعلمين: ${toAr(stats.totalTeacherRecords || 0)}`,
    `إجمالي الدروس المرفوعة: ${toAr(stats.totalLessons || 0)}`,
    `إجمالي المطلوب: ${toAr(stats.totalRequired || 0)}`,
    `متوسط الإنجاز: ${stats.avgCompletion || 0}%`,
    `متوسط ربط المخرجات: ${stats.avgOutcomesRatio || 0}%`,
    `الأسابيع المحسوبة: ${toAr(effectiveWeeks)}`,
  ];

  summaryLines.forEach((line) => {
    doc.text(line, 280, y, { align: "right" });
    y += 6;
  });

  y += 10;

  // الجدول الرئيسي
  const tableData = filteredTeachers.slice(0, 50).map((t, idx) => [
    toAr(idx + 1),
    t.teacherName || "-",
    t.schoolName || "-",
    toAr(t.weeklyQuotaTotal || 0),
    toAr(t.requiredLessonsTotal || 0),
    toAr(t.totalLessons || 0),
    toAr(t.remaining || 0),
    `${t.completion || 0}%`,
    `${t.outcomesRatio || 0}%`,
    toAr(t.classesCount || 0),
  ]);

  autoTable(doc, {
    startY: y,
    head: [
      [
        "#",
        "اسم المعلم",
        "المدرسة",
        "نصاب/أسبوع",
        "المطلوب",
        "المرفوع",
        "المتبقي",
        "نسبة الإنجاز",
        "نسبة المخرجات",
        "عدد الصفوف",
      ],
    ],
    body: tableData,
    styles: {
      font: fontName,
      fontSize: 8,
      halign: "center",
      cellPadding: 1.5,
    },
    headStyles: {
      font: fontName,
      fillColor: [52, 152, 219],
      textColor: 255,
      fontStyle: "normal",
      halign: "center",
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { top: 10, left: 10, right: 10 },
    tableWidth: "auto",
  });

  // تاريخ التقرير
  const date = new Date().toLocaleDateString("en-US");
  doc.setFontSize(9);
  const pageHeight = doc.internal.pageSize.height;
  doc.text(`تاريخ الطباعة: ${date}`, 280, pageHeight - 10, {
    align: "right",
  });

  doc.save(`تقرير-القسم-${date}.pdf`);
};
