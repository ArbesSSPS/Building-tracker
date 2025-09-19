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

    // Get user's floor and cleaning info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        room: {
          include: {
            floor: {
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
                }
              }
            }
          }
        }
      }
    })

    if (!user?.room?.floor) {
      return NextResponse.json({ error: 'Uživatel není přiřazen k žádnému patru' }, { status: 400 })
    }

    const floor = user.room.floor
    const currentPeriod = getCurrentPeriod(floor.cleaningSettings?.frequency || 'weekly')
    const currentRoomIndex = getCurrentRoomIndex(floor.cleaningRotations, currentPeriod)
    const currentRoom = floor.cleaningRotations[currentRoomIndex]
    
    // Check if there's a pending frequency change
    const hasPendingChange = floor.cleaningSettings?.pendingFrequency && 
                            floor.cleaningSettings?.pendingFromPeriod

    // Get cleaning records for current period
    const cleaningRecords = await prisma.cleaningRecord.findMany({
      where: {
        floorId: floor.id,
        period: currentPeriod
      },
      include: {
        user: true,
        room: true
      }
    })

    // Always show current period based on current frequency
    const displayPeriod = currentPeriod

    return NextResponse.json({
      floor: {
        id: floor.id,
        number: floor.number,
        name: floor.name
      },
      settings: floor.cleaningSettings,
      currentPeriod: displayPeriod,
      currentRoom: currentRoom ? {
        id: currentRoom.room.id,
        name: currentRoom.room.name,
        users: currentRoom.room.users.map(u => ({
          id: u.id,
          name: u.name,
          lastName: u.lastName,
          email: u.email
        }))
      } : null,
      rotation: floor.cleaningRotations.map(r => ({
        id: r.room.id,
        name: r.room.name,
        order: r.order,
        users: r.room.users.map(u => ({
          id: u.id,
          name: u.name,
          lastName: u.lastName,
          email: u.email
        }))
      })),
      records: cleaningRecords.map(r => ({
        id: r.id,
        photos: JSON.parse(r.photos || '[]'),
        completedAt: r.completedAt,
        user: {
          name: r.user.name,
          lastName: r.user.lastName
        },
        room: {
          name: r.room.name
        }
      })),
      hasPendingChange,
      pendingFrequency: floor.cleaningSettings?.pendingFrequency,
      pendingFromPeriod: floor.cleaningSettings?.pendingFromPeriod
    })
  } catch (error) {
    console.error('Cleaning fetch error:', error)
    return NextResponse.json(
      { error: 'Chyba při načítání uklid dat' },
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
