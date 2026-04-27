// convex/emailtest.ts
"use node";
import { action } from "./_generated/server";
import nodemailer from "nodemailer";

export const sendTestEmail = action({
  args: {},
  handler: async (ctx) => {
    const host = process.env.MINISTRY_SMTP_HOST!;
    const port = Number(process.env.MINISTRY_SMTP_PORT || 587);
    const user = process.env.MINISTRY_SMTP_USER!;
    const pass = process.env.MINISTRY_SMTP_PASS!;
    const fromName =
      process.env.MINISTRY_SMTP_FROM_NAME || "لوحة متابعة المعلمين";
    const testReceiver = process.env.MINISTRY_TEST_RECEIVER || user;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: false, // مع 587 نستخدم STARTTLS
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from: `"${fromName}" <${user}>`,
      to: testReceiver,
      subject: "اختبار إرسال من لوحة متابعة المعلمين",
      text: "هذه رسالة اختبارية من النظام.",
    });

    console.log("Message sent:", info.messageId);
    return { ok: true, messageId: info.messageId };
  },
});
