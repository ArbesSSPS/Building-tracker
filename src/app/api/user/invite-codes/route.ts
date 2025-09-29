import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Generate random invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const { count = 1, expiresInDays = 30 } = await request.json()

    if (count < 1 || count > 10) {
      return NextResponse.json({ error: 'Počet kódů musí být mezi 1 a 10' }, { status: 400 })
    }

    // Get user's room ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { roomId: true }
    })

    if (!user?.roomId) {
      return NextResponse.json({ error: 'Uživatel není přiřazen k žádné místnosti' }, { status: 400 })
    }

    // Generate invite codes
    const codes = []
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    for (let i = 0; i < count; i++) {
      let code
      let isUnique = false
      
      // Ensure code is unique
      while (!isUnique) {
        code = generateInviteCode()
        const existing = await prisma.registrationCode.findUnique({
          where: { code }
        })
        isUnique = !existing
      }

      const registrationCode = await prisma.registrationCode.create({
        data: {
          code: code!,
          expiresAt,
          // Store the inviting user's room ID in the roomId field
          roomId: user.roomId
        }
      })

      codes.push({
        id: registrationCode.id,
        code: registrationCode.code,
        expiresAt: registrationCode.expiresAt
      })
    }

    return NextResponse.json({
      success: true,
      codes,
      message: `Vygenerováno ${count} invite kódů`
    })
  } catch (error) {
    console.error('Invite codes generation error:', error)
    return NextResponse.json(
      { error: 'Chyba při generování invite kódů' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    // Get user's room ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { roomId: true }
    })

    if (!user?.roomId) {
      return NextResponse.json({ error: 'Uživatel není přiřazen k žádné místnosti' }, { status: 400 })
    }

    // Get invite codes created by this user (stored in usedBy field)
    const codes = await prisma.registrationCode.findMany({
      where: {
        usedBy: user.roomId,
        isUsed: false
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      codes: codes.map(code => ({
        id: code.id,
        code: code.code,
        expiresAt: code.expiresAt,
        createdAt: code.createdAt
      }))
    })
  } catch (error) {
    console.error('Invite codes fetch error:', error)
    return NextResponse.json(
      { error: 'Chyba při načítání invite kódů' },
      { status: 500 }
    )
  }
}
