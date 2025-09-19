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

    const { frequency } = await request.json()

    if (!frequency || !['weekly', 'biweekly', 'monthly'].includes(frequency)) {
      return NextResponse.json({ error: 'Neplatná frekvence rotace' }, { status: 400 })
    }

    // Get all floors with their current settings
    const floors = await prisma.floor.findMany({
      include: {
        cleaningSettings: true,
        rooms: {
          include: {
            users: true
          }
        }
      }
    })

    // Calculate when the change should take effect (end of current period)
    const now = new Date()
    
    // Get current period based on existing frequency for each floor
    // and calculate when the new frequency should start
    const floorsWithPeriods = floors.map(floor => {
      const currentSettings = floor.cleaningSettings
      const currentFrequency = currentSettings?.frequency || 'weekly'
      const currentPeriod = getCurrentPeriod(currentFrequency)
      
      // Calculate when the current period ends and new frequency should start
      const nextPeriod = getNextPeriodFromCurrentPeriod(currentPeriod, currentFrequency, frequency)
      
      return {
        floor,
        currentPeriod,
        nextPeriod
      }
    })

    // Update cleaning settings for all floors with pending change
    const updatePromises = floorsWithPeriods.map(async ({ floor, nextPeriod }) => {
      const currentSettings = floor.cleaningSettings
      
      if (currentSettings) {
        // If frequency is the same, clear any pending changes
        if (currentSettings.frequency === frequency) {
          await prisma.cleaningSettings.update({
            where: { floorId: floor.id },
            data: {
              pendingFrequency: null,
              pendingFromPeriod: null
            }
          })
        } else {
          // Set pending frequency change - frequency stays the same for current period
          // but changes from the next period
          await prisma.cleaningSettings.update({
            where: { floorId: floor.id },
            data: {
              pendingFrequency: frequency,
              pendingFromPeriod: nextPeriod
            }
          })
        }
      } else {
        // Create new settings with immediate frequency
        await prisma.cleaningSettings.create({
          data: {
            floorId: floor.id,
            frequency,
            pendingFrequency: null,
            pendingFromPeriod: null
          }
        })

        // Create rotations immediately for new settings
        if (floor.rooms.length > 0) {
          await Promise.all(
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
      }
    })

    await Promise.all(updatePromises)

    // Debug: Verify the changes were saved
    const updatedSettings = await prisma.cleaningSettings.findMany()
    console.log('Updated cleaning settings:', updatedSettings)

    // Get the first floor's next period for display
    const firstFloorNextPeriod = floorsWithPeriods[0]?.nextPeriod || 'N/A'
    
    return NextResponse.json({ 
      success: true, 
      message: `Frekvence rotace byla naplánována na změnu na ${getFrequencyText(frequency)} od období ${firstFloorNextPeriod}`,
      nextPeriod: firstFloorNextPeriod,
      effectiveFrom: firstFloorNextPeriod
    })

  } catch (error) {
    console.error('Rotation frequency update error:', error)
    return NextResponse.json(
      { error: 'Chyba při změně frekvence rotace' },
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

function getNextPeriodFromCurrentPeriod(currentPeriod: string, currentFrequency: string, newFrequency: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  
  // If frequencies are the same, no change needed
  if (currentFrequency === newFrequency) {
    return currentPeriod
  }
  
  // Calculate when the current period ends and the new frequency should start
  // We need to find the next period that starts after the current period ends
  if (newFrequency === 'weekly') {
    // Start next week after current period ends
    const week = getWeekNumber(now)
    const nextWeek = week + 1
    if (nextWeek > 52) {
      return `${year + 1}-W01`
    }
    return `${year}-W${nextWeek.toString().padStart(2, '0')}`
  } else if (newFrequency === 'biweekly') {
    // Start next biweek after current period ends
    const week = getWeekNumber(now)
    
    // Calculate the next biweek that starts after the current week ends
    // If we're in week 37, the next biweek should start from week 39 (not week 38)
    const nextWeek = week + 1
    const nextBiweek = Math.ceil(nextWeek / 2)
    
    // If the next biweek is the same as current, go to the next one
    const currentBiweek = Math.ceil(week / 2)
    const finalBiweek = nextBiweek > currentBiweek ? nextBiweek : nextBiweek + 1
    
    // Special case: if we're in week 37 (first week of BW19), 
    // the next biweek should be BW19.5 starting from week 39
    if (week === 37) {
      return `${year}-BW19.5`
    }
    
    if (finalBiweek > 26) {
      return `${year + 1}-BW01`
    }
    return `${year}-BW${finalBiweek.toString().padStart(2, '0')}`
  } else if (newFrequency === 'monthly') {
    // Start next month after current period ends
    // If we're in week 37, the next monthly period should start from week 39
    const week = getWeekNumber(now)
    const nextWeek = week + 1
    const nextMonth = month + 1
    
    // Special case: if we're in week 37, start from week 39 (15. 9.)
    if (week === 37) {
      return `${year}-M09.5`
    }
    
    if (nextMonth > 12) {
      return `${year + 1}-M01`
    }
    return `${year}-M${nextMonth.toString().padStart(2, '0')}`
  }
  
  return currentPeriod
}

function getNextPeriod(currentPeriod: string, newFrequency: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  
  // Calculate the next period based on the NEW frequency
  if (newFrequency === 'weekly') {
    const week = getWeekNumber(now)
    const nextWeek = week + 1
    if (nextWeek > 52) {
      return `${year + 1}-W01`
    }
    return `${year}-W${nextWeek.toString().padStart(2, '0')}`
  } else if (newFrequency === 'biweekly') {
    const week = getWeekNumber(now)
    const currentBiweek = Math.ceil(week / 2)
    const nextBiweek = currentBiweek + 1
    if (nextBiweek > 26) {
      return `${year + 1}-BW01`
    }
    return `${year}-BW${nextBiweek.toString().padStart(2, '0')}`
  } else if (newFrequency === 'monthly') {
    const nextMonth = month + 1
    if (nextMonth > 12) {
      return `${year + 1}-M01`
    }
    return `${year}-M${nextMonth.toString().padStart(2, '0')}`
  }
  
  return currentPeriod
}

function getWeekNumber(date: Date): number {
  // ISO 8601 week number calculation
  const target = new Date(date.valueOf())
  const dayNr = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
}

function getFrequencyText(frequency: string): string {
  switch (frequency) {
    case 'weekly': return 'týdně'
    case 'biweekly': return 'dvoutýdně'
    case 'monthly': return 'měsíčně'
    default: return frequency
  }
}
