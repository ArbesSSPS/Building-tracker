import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const codes = await prisma.registrationCode.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(codes)
  } catch (error) {
    console.error('Codes fetch error:', error)
    return NextResponse.json(
      { error: 'Chyba při načítání kódů' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const { count = 1, expiresInDays } = await request.json()

    if (count < 1 || count > 50) {
      return NextResponse.json(
        { error: 'Počet kódů musí být mezi 1 a 50' },
        { status: 400 }
      )
    }

    const codes = []
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null

    for (let i = 0; i < count; i++) {
      const code = generateCode()
      const registrationCode = await prisma.registrationCode.create({
        data: {
          code,
          expiresAt
        }
      })
      codes.push(registrationCode)
    }

    return NextResponse.json(codes)
  } catch (error) {
    console.error('Code generation error:', error)
    return NextResponse.json(
      { error: 'Chyba při generování kódů' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID kódu je povinné' },
        { status: 400 }
      )
    }

    await prisma.registrationCode.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Kód byl úspěšně smazán' })
  } catch (error) {
    console.error('Code deletion error:', error)
    return NextResponse.json(
      { error: 'Chyba při mazání kódu' },
      { status: 500 }
    )
  }
}

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
