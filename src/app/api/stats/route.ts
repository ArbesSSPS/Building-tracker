import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    // Get total people in building
    const totalPresent = await prisma.presence.count({
      where: { isPresent: true }
    })

    // Get people on user's floor
    let floorPresent = 0
    if (session.user.room?.floorId) {
      floorPresent = await prisma.presence.count({
        where: {
          isPresent: true,
          user: {
            room: {
              floorId: session.user.room.floorId
            }
          }
        }
      })
    }

    // Get floor statistics for admin
    let floorStats = []
    if (session.user.role === 'ADMIN') {
      floorStats = await prisma.floor.findMany({
        include: {
          rooms: {
            include: {
              users: {
                include: {
                  presence: true
                }
              }
            }
          }
        }
      })
    }

    return NextResponse.json({
      totalPresent,
      floorPresent,
      floorStats
    })
  } catch (error) {
    console.error('Stats fetch error:', error)
    return NextResponse.json(
      { error: 'Chyba při načítání statistik' },
      { status: 500 }
    )
  }
}
