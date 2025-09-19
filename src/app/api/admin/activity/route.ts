import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 })
    }

    // Get all users with their presence and room information
    const users = await prisma.user.findMany({
      include: {
        room: {
          include: {
            floor: true
          }
        },
        presence: true
      }
    })

    // Get all activity logs with user information
    const activityLogs = await prisma.activityLog.findMany({
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
      },
      orderBy: {
        timestamp: 'desc'
      }
    })

    // Group activity logs by user and date, then create work sessions
    const workSessions = []
    
    // Group by user and date
    const groupedByUserAndDate = activityLogs.reduce((acc, log) => {
      const userId = log.userId
      const date = log.timestamp.toISOString().split('T')[0]
      const key = `${userId}-${date}`
      
      if (!acc[key]) {
        acc[key] = {
          user: log.user,
          date: date,
          activities: []
        }
      }
      
      acc[key].activities.push(log)
      
      return acc
    }, {} as any)

    // Process each user-day combination to create work sessions
    Object.values(groupedByUserAndDate).forEach((session: any) => {
      // Sort activities by timestamp
      session.activities.sort((a: any, b: any) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )

      let currentCheckIn = null
      let sessionIndex = 0

      // Process activities chronologically to create work sessions
      for (const activity of session.activities) {
        if (activity.action === 'check_in') {
          // Start new work session
          currentCheckIn = activity
        } else if (activity.action === 'check_out' && currentCheckIn) {
          // Complete current work session
          workSessions.push({
            id: `${session.user.id}-${session.date}-${sessionIndex}`,
            user: session.user,
            date: session.date,
            checkIn: currentCheckIn,
            checkOut: activity,
            isComplete: true,
            isCurrentlyIn: false
          })
          currentCheckIn = null
          sessionIndex++
        }
      }

      // If there's an incomplete session (check-in without check-out)
      if (currentCheckIn) {
        workSessions.push({
          id: `${session.user.id}-${session.date}-${sessionIndex}`,
          user: session.user,
          date: session.date,
          checkIn: currentCheckIn,
          checkOut: null,
          isComplete: false,
          isCurrentlyIn: session.user.presence?.isPresent || false
        })
      }
    })

    // Sort by check-in time (newest first) then by user name
    workSessions.sort((a, b) => {
      const timeCompare = new Date(b.checkIn.timestamp).getTime() - new Date(a.checkIn.timestamp).getTime()
      if (timeCompare !== 0) return timeCompare
      return a.user.name.localeCompare(b.user.name)
    })

    // Persist penalties for late uncheckouts (after 23:30)
    const now = new Date()
    const penaltiesToUpsert: { userId: string, date: Date }[] = []
    for (const s of workSessions) {
      if (!s.checkOut) {
        const cutoff = new Date(`${s.date}T23:30:00`)
        if (now.getTime() >= cutoff.getTime()) {
          penaltiesToUpsert.push({ userId: s.user.id, date: new Date(s.date + 'T00:00:00') })
        }
      }
    }

    if (penaltiesToUpsert.length > 0) {
      for (const p of penaltiesToUpsert) {
        // idempotent via unique (userId, date)
        await prisma.uncheckoutPenalty.upsert({
          where: { userId_date: { userId: p.userId, date: p.date } },
          update: {},
          create: { userId: p.userId, date: p.date }
        })
      }
    }

    return NextResponse.json(workSessions)
  } catch (error) {
    console.error('Activity fetch error:', error)
    return NextResponse.json(
      { error: 'Chyba při načítání aktivity' },
      { status: 500 }
    )
  }
}
