import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function EmailTestButton() {
  const sendTest = useAction(api.emailtest.sendTestEmail);

  const handleSend = async () => {
    try {
      const res = await sendTest();
      console.log("Email test result:", res);
      toast.success("تم إرسال رسالة الاختبار (إن وصلت للبريد).");
    } catch (err) {
      console.error("Error sending email:", err);
      toast.error("خطأ في إرسال البريد، تحقق من رسالة الخطأ في الـ console.");
    }
  };

  return (
    <Button onClick={handleSend}>
      اختبار إرسال بريد
    </Button>
  );
}
