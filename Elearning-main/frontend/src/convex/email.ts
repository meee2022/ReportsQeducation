"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
// @ts-ignore
import nodemailer from "nodemailer";

export const sendEmailWithReport = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    attachmentBase64: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const host = process.env.MINISTRY_SMTP_HOST;
    const port = Number(process.env.MINISTRY_SMTP_PORT || 587);
    const user = process.env.MINISTRY_SMTP_USER;
    const pass = process.env.MINISTRY_SMTP_PASS;
    const fromName = process.env.MINISTRY_SMTP_FROM_NAME || "لوحة متابعة المعلمين";

    if (!host || !user || !pass) {
      throw new Error(
        "إعدادات البريد غير مكتملة. يرجى ضبط: MINISTRY_SMTP_HOST, MINISTRY_SMTP_USER, MINISTRY_SMTP_PASS في Convex Dashboard"
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    const mailOptions: Record<string, unknown> = {
      from: `"${fromName}" <${user}>`,
      to: args.to,
      subject: args.subject,
      html: args.html,
    };

    if (args.attachmentBase64) {
      mailOptions.attachments = [
        {
          filename: "teacher-report.pdf",
          content: Buffer.from(args.attachmentBase64, "base64"),
          contentType: "application/pdf",
        },
      ];
    }

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return { ok: true, messageId: String(info.messageId) };
  },
});
