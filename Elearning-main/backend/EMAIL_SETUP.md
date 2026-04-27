# إعداد خادم البريد الإلكتروني

هذا الملف يشرح كيفية تشغيل خادم البريد الإلكتروني لإرسال التقارير.

## المتطلبات

```bash
pip install -r requirements_email.txt
```

## إعداد Gmail

1. تفعيل المصادقة الثنائية (2FA) في حساب Gmail
2. إنشاء App Password من: https://myaccount.google.com/apppasswords
3. إنشاء ملف `.env` في مجلد backend:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

## تشغيل الخادم

```bash
cd backend
python email_server.py
```

الخادم سيعمل على http://localhost:5000

## استخدام من التطبيق

1. افتح صفحة "أداء المعلمين"
2. اضغط على معلم لعرض التفاصيل
3. اضغط زر "إرسال" 📧
4. أدخل البريد الإلكتروني
5. اضغط "إرسال"

## ملاحظة

تأكد من تشغيل خادم البريد قبل محاولة إرسال الرسائل.
