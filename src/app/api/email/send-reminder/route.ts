import { NextRequest, NextResponse } from 'next/server';
import { sendCleaningReminderEmail, testSMTPConnection, CleaningReminderData } from '@/lib/email';

// POST /api/email/send-reminder - Odeslání cleaning reminder emailu
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validace vstupních dat
    const requiredFields = ['recipientEmail', 'recipientName', 'weekDate', 'responsiblePeople', 'room'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Chybí povinné pole: ${field}` },
          { status: 400 }
        );
      }
    }

    // Příprava dat pro email
    const emailData: CleaningReminderData = {
      recipientEmail: body.recipientEmail,
      recipientName: body.recipientName,
      weekDate: body.weekDate,
      responsiblePeople: body.responsiblePeople,
      room: body.room,
      appLink: body.appLink || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/cleaning`,
      adminEmail: body.adminEmail || 'arbes@virtuex.cz',
    };

    // Odeslání emailu
    const success = await sendCleaningReminderEmail(emailData);

    if (success) {
      return NextResponse.json(
        { message: 'Email byl úspěšně odeslán' },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: 'Nepodařilo se odeslat email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Chyba v API endpointu:', error);
    return NextResponse.json(
      { error: 'Interní chyba serveru' },
      { status: 500 }
    );
  }
}

// GET /api/email/send-reminder - Test SMTP připojení
export async function GET() {
  try {
    const isConnected = await testSMTPConnection();
    
    if (isConnected) {
      return NextResponse.json(
        { message: 'SMTP připojení je funkční' },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: 'SMTP připojení selhalo' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Chyba při testování SMTP:', error);
    return NextResponse.json(
      { error: 'Chyba při testování SMTP připojení' },
      { status: 500 }
    );
  }
}
