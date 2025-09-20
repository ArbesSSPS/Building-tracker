import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token a heslo jsou povinné' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Heslo musí mít alespoň 6 znaků' },
        { status: 400 }
      )
    }

    // Najít uživatele podle tokenu
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date() // Token ještě nevypršel
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Neplatný nebo vypršelý reset token' },
        { status: 400 }
      )
    }

    // Hashovat nové heslo
    const hashedPassword = await bcrypt.hash(password, 12)

    // Aktualizovat heslo a vymazat reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Heslo bylo úspěšně změněno'
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Chyba při změně hesla' },
      { status: 500 }
    )
  }
}
