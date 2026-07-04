import nodemailer from "nodemailer";

type VerificationMessage = {
  email: string;
  phone?: string;
  code: string;
};

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT ?? 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM ?? smtpUser;
const smsWebhookUrl = process.env.SMS_WEBHOOK_URL;
const smsWebhookToken = process.env.SMS_WEBHOOK_TOKEN;

const mailTransport = smtpHost && smtpFrom
  ? nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: process.env.SMTP_SECURE === "true" || smtpPort === 465,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined
  })
  : null;

export function notificationStatus() {
  return {
    email: Boolean(mailTransport),
    sms: Boolean(smsWebhookUrl)
  };
}

export async function sendVerificationMessage({ email, phone, code }: VerificationMessage) {
  const deliveries: string[] = [];
  const errors: string[] = [];

  if (mailTransport) {
    try {
      await mailTransport.sendMail({
        from: smtpFrom,
        to: email,
        subject: "[2027 서울 WYD 세곡동 성당] 인증번호 안내",
        text: `인증번호는 ${code} 입니다. 10분 안에 입력해 주세요.`,
        html: `<p>인증번호는 <strong>${code}</strong> 입니다.</p><p>10분 안에 입력해 주세요.</p>`
      });
      deliveries.push("email");
    } catch (error) {
      errors.push(`email:${(error as Error).message}`);
    }
  }

  if (smsWebhookUrl && phone) {
    try {
      const response = await fetch(smsWebhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(smsWebhookToken ? { authorization: `Bearer ${smsWebhookToken}` } : {})
        },
        body: JSON.stringify({
          to: phone,
          text: `[2027 서울 WYD 세곡동 성당] 인증번호는 ${code} 입니다.`
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      deliveries.push("sms");
    } catch (error) {
      errors.push(`sms:${(error as Error).message}`);
    }
  }

  return { deliveries, errors };
}
