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

    const users = await prisma.user.findMany({
      include: {
        room: {
          include: {
            floor: true
          }
        },
        presence: true,
        penalties: true
      },
      orderBy: { name: 'asc' }
    })

    const withPenaltyCount = users.map((u: any) => ({
      ...u,
      penaltyCount: Array.isArray(u.penalties) ? u.penalties.length : 0
    }))

    return NextResponse.json(withPenaltyCount)
  } catch (error) {
    console.error('Users fetch error:', error)
    return NextResponse.json(
      { error: 'Chyba při načítání uživatelů' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const { userId, roomId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'ID uživatele je povinné' },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        roomId: roomId || null
      },
      include: {
        room: {
          include: {
            floor: true
          }
        },
        presence: true
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('User update error:', error)
    return NextResponse.json(
      { error: 'Chyba při aktualizaci uživatele' },
      { status: 500 }
    )
  }
}
