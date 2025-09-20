import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !['ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
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
    
    if (!session?.user?.id || !['ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
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

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !['ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json(
        { error: 'ID uživatele je povinné' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        room: true,
        presence: true,
        penalties: true,
        activityLogs: true,
        cleaningRecords: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Uživatel nenalezen' },
        { status: 404 }
      )
    }

    // Delete user and all related data
    await prisma.$transaction(async (tx) => {
      // Delete all related records
      await tx.activityLog.deleteMany({
        where: { userId }
      })

      await tx.uncheckoutPenalty.deleteMany({
        where: { userId }
      })

      await tx.cleaningRecord.deleteMany({
        where: { userId }
      })

      await tx.presence.deleteMany({
        where: { userId }
      })

      // Finally delete the user
      await tx.user.delete({
        where: { id: userId }
      })
    })

    return NextResponse.json({ 
      success: true, 
      message: `Uživatel ${user.name} ${user.lastName || ''} byl úspěšně smazán` 
    })
  } catch (error) {
    console.error('User deletion error:', error)
    return NextResponse.json(
      { error: 'Chyba při mazání uživatele' },
      { status: 500 }
    )
  }
}
