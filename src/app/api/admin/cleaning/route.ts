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

    // Get all floors with cleaning settings and rotations
    const floors = await prisma.floor.findMany({
      include: {
        cleaningSettings: true,
        rooms: {
          include: {
            users: true
          }
        },
        cleaningRotations: {
          include: {
            room: {
              include: {
                users: true
              }
            }
          },
          orderBy: { order: 'asc' }
        },
        cleaningRecords: {
          include: {
            user: true,
            room: true
          },
          orderBy: { completedAt: 'desc' }
        }
      }
    })

    // Get current period for each floor
    const floorsWithCurrentInfo = floors.map(floor => {
      const currentPeriod = getCurrentPeriod(floor.cleaningSettings?.frequency || 'weekly')
      const currentRoomIndex = getCurrentRoomIndex(floor.cleaningRotations, currentPeriod)
      const currentRoom = floor.cleaningRotations[currentRoomIndex]
      
      // Check if there's a pending frequency change
      const hasPendingChange = floor.cleaningSettings?.pendingFrequency && 
                              floor.cleaningSettings?.pendingFromPeriod

      // If there's a pending change, check if it's time to apply it
      if (hasPendingChange) {
        const pendingFromPeriod = floor.cleaningSettings.pendingFromPeriod
        const currentPeriodWithNewFrequency = getCurrentPeriod(floor.cleaningSettings.pendingFrequency)
        
        // Check if the pending period has started
        // Only apply when we're in the pending period or later
        if (pendingFromPeriod && currentPeriodWithNewFrequency && 
            pendingFromPeriod === currentPeriodWithNewFrequency) {
          // Apply the pending frequency change
          prisma.cleaningSettings.update({
            where: { floorId: floor.id },
            data: {
              frequency: floor.cleaningSettings.pendingFrequency,
              pendingFrequency: null,
              pendingFromPeriod: null
            }
          }).catch(console.error)

          // Regenerate rotations for the new frequency
          prisma.cleaningRotation.deleteMany({
            where: { floorId: floor.id }
          }).then(() => {
            if (floor.rooms.length > 0) {
              return Promise.all(
                floor.rooms.map((room, index) =>
                  prisma.cleaningRotation.create({
                    data: {
                      floorId: floor.id,
                      roomId: room.id,
                      order: index
                    }
                  })
                )
              )
            }
          }).catch(console.error)
        }
      }

      // Always show current period based on current frequency
      const displayPeriod = currentPeriod

      return {
        ...floor,
        settings: floor.cleaningSettings,
        currentPeriod: displayPeriod,
        currentRoom: currentRoom ? {
          id: currentRoom.room.id,
          name: currentRoom.room.name,
          users: currentRoom.room.users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email
          }))
        } : null,
        cleaningRecords: floor.cleaningRecords.map(r => ({
          ...r,
          photos: JSON.parse(r.photos || '[]')
        })),
        hasPendingChange
      }
    })

    return NextResponse.json(floorsWithCurrentInfo)
  } catch (error) {
    console.error('Admin cleaning fetch error:', error)
    return NextResponse.json(
      { error: 'Chyba při načítání uklid dat' },
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

    const { floorId, frequency } = await request.json()

    if (!floorId || !frequency) {
      return NextResponse.json({ error: 'Chybí povinné parametry' }, { status: 400 })
    }

    if (!['weekly', 'biweekly', 'monthly'].includes(frequency)) {
      return NextResponse.json({ error: 'Neplatná frekvence uklidu' }, { status: 400 })
    }

    // Update or create cleaning settings
    const settings = await prisma.cleaningSettings.upsert({
      where: { floorId },
      update: { frequency },
      create: { floorId, frequency }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Cleaning settings update error:', error)
    return NextResponse.json(
      { error: 'Chyba při aktualizaci nastavení uklidu' },
      { status: 500 }
    )
  }
}

function getCurrentPeriod(frequency: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  
  if (frequency === 'weekly') {
    const week = getWeekNumber(now)
    return `${year}-W${week.toString().padStart(2, '0')}`
  } else if (frequency === 'biweekly') {
    const week = getWeekNumber(now)
    const biweek = Math.ceil(week / 2)
    return `${year}-BW${biweek.toString().padStart(2, '0')}`
  } else if (frequency === 'monthly') {
    return `${year}-M${month.toString().padStart(2, '0')}`
  }
  
  return `${year}-W${getWeekNumber(now).toString().padStart(2, '0')}`
}

function getWeekNumber(date: Date): number {
  // Custom week calculation: týden končí v neděli, pokud rok končí dříve než v neděli, 
  // tak se týden protáhne do posledního dne roku, a od 1.1. pak začíná od 1.1. do 7.1.
  const year = date.getFullYear()
  
  // Týden 1: 1.1. do 7.1.
  const jan1 = new Date(year, 0, 1)
  const jan7 = new Date(year, 0, 7)
  if (date >= jan1 && date <= jan7) {
    return 1
  }
  
  // Pro ostatní týdny: začátek v pondělí, konec v neděli
  // Najdi první pondělí roku (8.1. nebo později)
  let firstMonday = new Date(year, 0, 8) // 8. ledna
  const dayOfWeek = firstMonday.getDay()
  if (dayOfWeek !== 1) { // Pokud není pondělí
    firstMonday = new Date(firstMonday.getTime() + (8 - dayOfWeek) * 24 * 60 * 60 * 1000)
  }
  
  // Vypočítej týden na základě rozdílu od prvního pondělí
  const diffInMs = date.getTime() - firstMonday.getTime()
  const diffInDays = Math.floor(diffInMs / (24 * 60 * 60 * 1000))
  let weekNumber = Math.floor(diffInDays / 7) + 2 // +2 protože týden 1 je 1.1.-7.1.
  
  // Zkontroluj, zda není konec roku
  const lastDayOfYear = new Date(year, 11, 31)
  const lastMonday = new Date(lastDayOfYear.getTime() - (lastDayOfYear.getDay() + 6) % 7 * 24 * 60 * 60 * 1000)
  
  // Pokud je datum v posledním týdnu roku a konec týdne by byl v dalším roce,
  // použij poslední den roku jako konec týdne
  if (date >= lastMonday && date <= lastDayOfYear) {
    return weekNumber
  }
  
  return weekNumber
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

