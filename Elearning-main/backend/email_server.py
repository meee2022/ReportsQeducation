from flask import Flask, request, jsonify
from flask_cors import CORS
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
import os

app = Flask(__name__)
CORS(app)

# إعدادات البريد الإلكتروني (يجب تعديلها)
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER", "your-email@example.com")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "your-app-password")

@app.route('/api/send-email', methods=['POST'])
def send_email():
    try:
        data = request.json
        to_email = data.get('to')
        subject = data.get('subject')
        body = data.get('body')
        attachment = data.get('attachment')  # base64 PDF

        if not to_email or not subject or not body:
            return jsonify({'error': 'Missing required fields'}), 400

        # إنشاء الرسالة
        msg = MIMEMultipart()
        msg['From'] = EMAIL_USER
        msg['To'] = to_email
        msg['Subject'] = subject

        # إضافة النص
        msg.attach(MIMEText(body, 'html', 'utf-8'))

        # إضافة المرفق إذا وجد
        if attachment:
            import base64
            pdf_data = base64.b64decode(attachment)
            pdf_part = MIMEApplication(pdf_data, _subtype='pdf')
            pdf_part.add_header('Content-Disposition', 'attachment', filename='report.pdf')
            msg.attach(pdf_part)

        # إرسال البريد
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            server.send_message(msg)

        return jsonify({'success': True, 'message': 'Email sent successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
