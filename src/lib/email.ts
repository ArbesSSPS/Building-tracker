import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

// SMTP konfigurace
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.websupport.cz',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // true pro port 465, false pro ostatní porty
  auth: {
    user: process.env.SMTP_USER || 'arbes@virtuex.cz',
    pass: process.env.SMTP_PASS || '|S1NkY[+L]AoeR.ygYxP',
  },
};

// Vytvoření transporteru
const transporter = nodemailer.createTransport(smtpConfig);

// Interface pro cleaning reminder data
export interface CleaningReminderData {
  recipientEmail: string;
  recipientName: string;
  weekDate: string;
  responsiblePeople: string;
  room: string;
  appLink: string;
  adminEmail: string;
}

// Načtení HTML template
function getEmailTemplate(): string {
  const templatePath = path.join(process.cwd(), 'cleaning-reminder-email.html');
  return fs.readFileSync(templatePath, 'utf8');
}

// Nahrazení placeholderů v template
function replacePlaceholders(template: string, data: CleaningReminderData): string {
  return template
    .replace(/\[DATUM_TÝDNE\]/g, data.weekDate)
    .replace(/\[ODPOVĚDNÍ_LIDÉ\]/g, data.responsiblePeople)
    .replace(/\[MÍSTNOST\]/g, data.room)
    .replace(/\[LINK_NA_APLIKACI\]/g, data.appLink)
    .replace(/\[ADMIN_EMAIL\]/g, data.adminEmail);
}

// Odeslání cleaning reminder emailu
export async function sendCleaningReminderEmail(data: CleaningReminderData): Promise<boolean> {
  try {
    console.log('[EMAIL DEBUG] Sending email with data:', {
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName,
      weekDate: data.weekDate,
      responsiblePeople: data.responsiblePeople,
      room: data.room
    });
    
    // Načtení a úprava HTML template
    const htmlTemplate = getEmailTemplate();
    const htmlContent = replacePlaceholders(htmlTemplate, data);
    
    console.log('[EMAIL DEBUG] Replaced content preview:', {
      weekDate: data.weekDate,
      responsiblePeople: data.responsiblePeople,
      room: data.room
    });

    // Konfigurace emailu
    const mailOptions = {
      from: `"Arbesovo Náměstí" <${smtpConfig.auth.user}>`,
      to: data.recipientEmail,
      cc: 'jajirka.kolb@gmail.com', // CC na test email
      subject: `Připomínka úklidu - Arbesovo nám. 70/4 (${data.weekDate})`,
      html: htmlContent,
      text: `
Dobrý den,

Tímto emailem Vás informujeme, že jste na řadě s úklidem v příštím týdnu.

Informace o úklidovém týdnu:
- Datum: ${data.weekDate}
- Odpovědní lidé: ${data.responsiblePeople}
- Místnost: ${data.room}

Důležité informace:
- Úklid musí být dokončen do konce týdne
- Před a po úklidu pořiďte fotografie
- Označte úklid jako dokončený v aplikaci
- V případě problémů kontaktujte administrátora

Otevřít aplikaci: ${data.appLink}

Děkujeme za Vaši spolupráci!

Building Tracker
Systém pro správu úklidových prací
      `.trim(),
    };

    // Odeslání emailu
    const info = await transporter.sendMail(mailOptions);
    console.log('Email odeslán:', info.messageId);
    return true;
  } catch (error) {
    console.error('Chyba při odesílání emailu:', error);
    return false;
  }
}

// Test SMTP připojení
export async function testSMTPConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('SMTP připojení je funkční');
    return true;
  } catch (error) {
    console.error('SMTP připojení selhalo:', error);
    return false;
  }
}

// Odeslání testovacího emailu
export async function sendTestEmail(to: string): Promise<boolean> {
  try {
    const testData: CleaningReminderData = {
      recipientEmail: to,
      recipientName: 'Test User',
      weekDate: '1. - 7. ledna 2025',
      responsiblePeople: 'Jan Novák, Marie Svobodová',
      room: 'Kuchyň',
      appLink: 'http://localhost:3000/cleaning',
      adminEmail: 'arbes@virtuex.cz',
    };

    return await sendCleaningReminderEmail(testData);
  } catch (error) {
    console.error('Chyba při odesílání testovacího emailu:', error);
    return false;
  }
}
