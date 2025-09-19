import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    // Get user with room and floor information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        room: {
          include: {
            floor: true,
            users: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Uživatel nenalezen' }, { status: 404 })
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      room: user.room ? {
        id: user.room.id,
        name: user.room.name,
        floor: {
          id: user.room.floor.id,
          number: user.room.floor.number,
          name: user.room.floor.name
        },
        users: user.room.users
      } : null,
      alarmCode: user.alarmCode || null
    })
  } catch (error) {
    console.error('User profile fetch error:', error)
    return NextResponse.json(
      { error: 'Chyba při načítání profilu uživatele' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const { alarmCode } = await request.json()

    // Update user's alarm code
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { alarmCode }
    })

    return NextResponse.json({
      success: true,
      alarmCode: updatedUser.alarmCode
    })
  } catch (error) {
    console.error('User profile update error:', error)
    return NextResponse.json(
      { error: 'Chyba při aktualizaci profilu uživatele' },
      { status: 500 }
    )
  }
}
