import nodemailer from "nodemailer";
import { normalizePilgrimLanguage, type PilgrimLanguage } from "./pilgrimDiet.js";

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

type PilgrimCardMessage = {
  email?: string;
  phone?: string;
  name: string;
  cardUrl: string;
  language?: PilgrimLanguage;
};

const cardMessageText: Record<PilgrimLanguage, { subject: string; intro: (name: string) => string; action: string }> = {
  ko: { subject: "[2027 서울 WYD 세곡동 성당] 순례자 카드 안내", intro: (name) => `${name} 순례자님의 등록 카드입니다.`, action: "아래 링크에서 바코드와 등록 정보를 확인해 주세요." },
  en: { subject: "[WYD Seoul 2027 Segok Parish] Pilgrim card", intro: (name) => `This is the pilgrim card for ${name}.`, action: "Open the link below to view the barcode and registration details." },
  es: { subject: "[WYD Seúl 2027 Parroquia Segok] Tarjeta de peregrino", intro: (name) => `Esta es la tarjeta de peregrino de ${name}.`, action: "Abra el enlace para ver el código de barras y los datos registrados." },
  it: { subject: "[WYD Seoul 2027 Parrocchia Segok] Carta del pellegrino", intro: (name) => `Questa è la carta del pellegrino di ${name}.`, action: "Apri il link per vedere il codice a barre e i dati registrati." },
  fr: { subject: "[JMJ Séoul 2027 Paroisse Segok] Carte du pèlerin", intro: (name) => `Voici la carte de pèlerin de ${name}.`, action: "Ouvrez le lien pour voir le code-barres et les informations enregistrées." },
  pt: { subject: "[JMJ Seul 2027 Paróquia Segok] Cartão do peregrino", intro: (name) => `Este é o cartão de peregrino de ${name}.`, action: "Abra o link para ver o código de barras e os dados registados." }
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] ?? char));
}

export async function sendPilgrimCardMessage({ email, phone, name, cardUrl, language }: PilgrimCardMessage) {
  const deliveries: string[] = [];
  const errors: string[] = [];
  const copy = cardMessageText[normalizePilgrimLanguage(language)];
  const text = `${copy.intro(name)}\n${copy.action}\n${cardUrl}`;

  if (email) {
    if (!mailTransport) errors.push("email:SMTP 발송 서비스가 설정되지 않았습니다.");
    else {
      try {
        await mailTransport.sendMail({
          from: smtpFrom,
          to: email,
          subject: copy.subject,
          text,
          html: `<p>${escapeHtml(copy.intro(name))}</p><p>${escapeHtml(copy.action)}</p><p><a href="${escapeHtml(cardUrl)}">${escapeHtml(cardUrl)}</a></p>`
        });
        deliveries.push("email");
      } catch (error) { errors.push(`email:${(error as Error).message}`); }
    }
  }

  if (phone) {
    if (!smsWebhookUrl) errors.push("sms:SMS 발송 서비스가 설정되지 않았습니다.");
    else {
      try {
        const response = await fetch(smsWebhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json", ...(smsWebhookToken ? { authorization: `Bearer ${smsWebhookToken}` } : {}) },
          body: JSON.stringify({ to: phone, text })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        deliveries.push("sms");
      } catch (error) { errors.push(`sms:${(error as Error).message}`); }
    }
  }

  return { deliveries, errors };
}
