import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: 'Kód je povinný' },
        { status: 400 }
      )
    }

    const registrationCode = await prisma.registrationCode.findUnique({
      where: { code }
    })

    if (!registrationCode) {
      return NextResponse.json(
        { error: 'Neplatný kód' },
        { status: 400 }
      )
    }

    if (registrationCode.isUsed) {
      return NextResponse.json(
        { error: 'Kód již byl použit' },
        { status: 400 }
      )
    }

    if (registrationCode.expiresAt && registrationCode.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Kód vypršel' },
        { status: 400 }
      )
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Code validation error:', error)
    return NextResponse.json(
      { error: 'Chyba při validaci kódu' },
      { status: 500 }
    )
  }
}
