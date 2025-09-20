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

// Interface pro password reset data
export interface PasswordResetData {
  recipientEmail: string;
  recipientName: string;
  resetLink: string;
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
      cc: 'arbes@virtuex.cz', // CC na admin email
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

// Odeslání password reset emailu
export async function sendPasswordResetEmail(data: PasswordResetData): Promise<boolean> {
  try {
    console.log('[PASSWORD RESET] Sending reset email to:', data.recipientEmail);
    
    // Konfigurace emailu
    const mailOptions = {
      from: `"Arbesovo Náměstí" <${smtpConfig.auth.user}>`,
      to: data.recipientEmail,
      subject: 'Obnovení hesla - Building Tracker',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Obnovení hesla</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Building Tracker</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Dobrý den, ${data.recipientName}!</h2>
            
            <p style="color: #666; line-height: 1.6;">
              Obdrželi jsme žádost o obnovení hesla pro váš účet v Building Tracker systému.
            </p>
            
            <p style="color: #666; line-height: 1.6;">
              Pro obnovení hesla klikněte na tlačítko níže:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.resetLink}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        display: inline-block; 
                        font-weight: bold;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                Obnovit heslo
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; line-height: 1.6;">
              Pokud jste nepožádali o obnovení hesla, můžete tento email ignorovat. 
              Vaše heslo zůstane beze změny.
            </p>
            
            <p style="color: #999; font-size: 14px; line-height: 1.6;">
              Tento odkaz je platný po dobu 1 hodiny z bezpečnostních důvodů.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e1e5e9; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              Building Tracker - Systém pro správu budovy<br>
              Arbesovo náměstí 70/4, Praha
            </p>
          </div>
        </div>
      `,
      text: `
Dobrý den, ${data.recipientName}!

Obdrželi jsme žádost o obnovení hesla pro váš účet v Building Tracker systému.

Pro obnovení hesla klikněte na následující odkaz:
${data.resetLink}

Pokud jste nepožádali o obnovení hesla, můžete tento email ignorovat. 
Vaše heslo zůstane beze změny.

Tento odkaz je platný po dobu 1 hodiny z bezpečnostních důvodů.

---
Building Tracker - Systém pro správu budovy
Arbesovo náměstí 70/4, Praha
      `.trim(),
    };

    // Odeslání emailu
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email odeslán:', info.messageId);
    return true;
  } catch (error) {
    console.error('Chyba při odesílání password reset emailu:', error);
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
