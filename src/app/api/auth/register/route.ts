import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, code } = await request.json()

    if (!name || !email || !password || !code) {
      return NextResponse.json(
        { error: 'Všechna pole jsou povinná' },
        { status: 400 }
      )
    }

    // Validate registration code
    const registrationCode = await prisma.registrationCode.findUnique({
      where: { code }
    })

    if (!registrationCode) {
      return NextResponse.json(
        { error: 'Neplatný registrační kód' },
        { status: 400 }
      )
    }

    if (registrationCode.isUsed) {
      return NextResponse.json(
        { error: 'Registrační kód již byl použit' },
        { status: 400 }
      )
    }

    if (registrationCode.expiresAt && registrationCode.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Registrační kód vypršel' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Uživatel s tímto emailem již existuje' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user and mark code as used in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'USER',
          // If the code was created by a user (has roomId in usedBy), assign to that room
          roomId: registrationCode.usedBy && registrationCode.usedBy.length === 25 ? registrationCode.usedBy : null
        }
      })

      // Create presence record
      await tx.presence.create({
        data: {
          userId: user.id,
          isPresent: false
        }
      })

      // Mark code as used
      await tx.registrationCode.update({
        where: { id: registrationCode.id },
        data: {
          isUsed: true,
          usedBy: user.id,
          usedAt: new Date()
        }
      })

      return user
    })

    return NextResponse.json(
      { message: 'Uživatel byl úspěšně vytvořen' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Chyba při vytváření uživatele' },
      { status: 500 }
    )
  }
}
