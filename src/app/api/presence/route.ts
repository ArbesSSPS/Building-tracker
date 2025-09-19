import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('GET Session:', session)
    console.log('GET User ID:', session?.user?.id)
    
    if (!session?.user?.id) {
      console.log('GET No session or user ID')
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    // Get presence data for the user
    const presence = await prisma.presence.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          include: {
            room: {
              include: {
                floor: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(presence)
  } catch (error) {
    console.error('Presence fetch error:', error)
    return NextResponse.json(
      { error: 'Chyba při načítání přítomnosti' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('Session:', session)
    console.log('User ID:', session?.user?.id)
    
    if (!session?.user?.id) {
      console.log('No session or user ID')
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    const { isPresent } = await request.json()
    console.log('isPresent:', isPresent)

    // First, ensure the user exists in the database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    console.log('User found:', user)

    if (!user) {
      console.log('User not found in database')
      return NextResponse.json({ error: 'Uživatel neexistuje' }, { status: 404 })
    }

    // Get current presence to check if status is changing
    const currentPresence = await prisma.presence.findUnique({
      where: { userId: session.user.id }
    })

    // Update presence first
    const presence = await prisma.presence.upsert({
      where: { userId: session.user.id },
      update: {
        isPresent,
        lastSeen: new Date()
      },
      create: {
        userId: session.user.id,
        isPresent,
        lastSeen: new Date()
      }
    })

    // Only log activity if status is actually changing
    if (!currentPresence || currentPresence.isPresent !== isPresent) {
      // Log the activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: isPresent ? 'check_in' : 'check_out',
          timestamp: new Date()
        }
      })
    }

    return NextResponse.json(presence)
  } catch (error) {
    console.error('Presence update error:', error)
    return NextResponse.json(
      { error: 'Chyba při aktualizaci přítomnosti' },
      { status: 500 }
    )
  }
}
