import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const { floorId } = await request.json()

    if (!floorId) {
      return NextResponse.json({ error: 'Chybí ID patra' }, { status: 400 })
    }

    // Get all rooms for this floor
    const rooms = await prisma.room.findMany({
      where: { floorId },
      include: { users: true }
    })

    if (rooms.length === 0) {
      return NextResponse.json({ error: 'Na tomto patře nejsou žádné místnosti' }, { status: 400 })
    }

    // Delete existing rotations for this floor
    await prisma.cleaningRotation.deleteMany({
      where: { floorId }
    })

    // Create new rotations
    const rotations = await Promise.all(
      rooms.map((room, index) =>
        prisma.cleaningRotation.create({
          data: {
            floorId,
            roomId: room.id,
            order: index
          },
          include: {
            room: {
              include: {
                users: true
              }
            }
          }
        })
      )
    )

    return NextResponse.json(rotations)
  } catch (error) {
    console.error('Cleaning rotation update error:', error)
    return NextResponse.json(
      { error: 'Chyba při aktualizaci rotace uklidu' },
      { status: 500 }
    )
  }
}
