import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmail } from '@/lib/email';

// POST /api/email/test - Odeslání testovacího emailu
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.email) {
      return NextResponse.json(
        { error: 'Chybí email adresa' },
        { status: 400 }
      );
    }

    // Odeslání testovacího emailu
    const success = await sendTestEmail(body.email);

    if (success) {
      return NextResponse.json(
        { message: 'Testovací email byl úspěšně odeslán' },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: 'Nepodařilo se odeslat testovací email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Chyba při odesílání testovacího emailu:', error);
    return NextResponse.json(
      { error: 'Interní chyba serveru' },
      { status: 500 }
    );
  }
}
