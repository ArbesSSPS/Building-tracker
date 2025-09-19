import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const { photos, roomId, floorId, period } = await request.json()

    if (!photos || !Array.isArray(photos) || photos.length !== 3) {
      return NextResponse.json({ error: 'Musíte nahrát přesně 3 fotografie' }, { status: 400 })
    }

    // Check if user is assigned to this room and floor
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        room: {
          include: { 
            floor: {
              include: {
                cleaningRotations: {
                  include: {
                    room: true
                  },
                  orderBy: { order: 'asc' }
                }
              }
            }
          }
        }
      }
    })

    if (!user?.room?.floor || user.room.floor.id !== floorId || user.room.id !== roomId) {
      return NextResponse.json({ error: 'Nejste přiřazeni k této místnosti' }, { status: 403 })
    }

    // Check if this room is currently responsible for cleaning
    const currentRoomIndex = getCurrentRoomIndex(user.room.floor.cleaningRotations, period)
    const currentRoom = user.room.floor.cleaningRotations[currentRoomIndex]
    
    if (!currentRoom || currentRoom.roomId !== roomId) {
      return NextResponse.json({ error: 'Vaše místnost není aktuálně zodpovědná za uklid' }, { status: 403 })
    }

    // Check if cleaning is already completed for this period
    const existingRecord = await prisma.cleaningRecord.findFirst({
      where: {
        floorId,
        roomId,
        period
      }
    })

    if (existingRecord) {
      return NextResponse.json({ error: 'Uklid pro toto období již byl dokončen' }, { status: 400 })
    }

    // Create cleaning record for the room
    const cleaningRecord = await prisma.cleaningRecord.create({
      data: {
        floorId,
        roomId,
        userId: session.user.id,
        photos: JSON.stringify(photos),
        period,
        completedAt: new Date()
      },
      include: {
        user: true,
        room: true,
        floor: true
      }
    })

    return NextResponse.json({
      ...cleaningRecord,
      photos: JSON.parse(cleaningRecord.photos)
    })
  } catch (error) {
    console.error('Cleaning completion error:', error)
    return NextResponse.json(
      { error: 'Chyba při dokončování uklidu' },
      { status: 500 }
    )
  }
}

function getCurrentRoomIndex(rotations: any[], period: string): number {
  if (rotations.length === 0) return 0
  
  // Extract period number from period string
  let periodNumber = 0
  
  if (period.includes('-W')) {
    // Weekly: 2024-W01 -> 1
    periodNumber = parseInt(period.split('-W')[1])
  } else if (period.includes('-BW')) {
    // Biweekly: 2024-BW01 -> 1
    periodNumber = parseInt(period.split('-BW')[1])
  } else if (period.includes('-M')) {
    // Monthly: 2024-M01 -> 1
    periodNumber = parseInt(period.split('-M')[1])
  }
  
  // Use period number for deterministic rotation
  return (periodNumber - 1) % rotations.length
}
