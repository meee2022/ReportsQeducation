import React, { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const EmailDialog = ({ open, onClose, teacher }) => {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(
    `تقرير أداء المعلم: ${teacher?.teacherName || ""}`
  );
  const [body, setBody] = useState(
    `مرحباً،\n\nنرفق لكم تقرير أداء المعلم ${teacher?.teacherName || ""} من مدرسة ${teacher?.schoolName || ""}.\n\nمع تحيات فريق الإدارة`
  );

  const handleOpenOutlook = () => {
    if (!email) {
      toast.error("الرجاء إدخال البريد الإلكتروني");
      return;
    }

    const mailtoLink =
      `mailto:${encodeURIComponent(email)}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoLink;

    toast.success("جاري فتح Outlook...");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            إرسال التقرير بالبريد الإلكتروني
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-right">
              البريد الإلكتروني للمستلم
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@edu.gov.qa"
              className="text-right"
              dir="ltr"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-right">
              الموضوع
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-right"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-right">
              نص الرسالة
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-right"
              placeholder="نص الرسالة..."
              dir="rtl"
            />
          </div>

          <p className="text-xs text-muted-foreground text-right">
            سيتم فتح Outlook تلقائياً مع تعبئة بيانات الرسالة
          </p>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleOpenOutlook} className="gap-2">
            <Mail className="h-4 w-4" />
            فتح Outlook
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
