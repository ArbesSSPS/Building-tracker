import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email je povinný' },
        { status: 400 }
      )
    }

    // Najít uživatele podle emailu
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      // Pro bezpečnost vracíme stejnou odpověď i když uživatel neexistuje
      return NextResponse.json({
        success: true,
        message: 'Pokud je email v systému, byl odeslán reset link'
      })
    }

    // Generovat reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hodina

    // Uložit token do databáze
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpires
      }
    })

    // Vytvořit reset link
    const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`

    // Odeslat email
    const emailSent = await sendPasswordResetEmail({
      recipientEmail: user.email,
      recipientName: user.name,
      resetLink
    })

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Chyba při odesílání emailu' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Pokud je email v systému, byl odeslán reset link'
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Chyba při zpracování požadavku' },
      { status: 500 }
    )
  }
}
