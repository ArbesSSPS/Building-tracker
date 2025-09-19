import { NextRequest, NextResponse } from 'next/server';
import { sendCleaningReminderEmail, CleaningReminderData } from '@/lib/email';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to get current period based on frequency (same as admin panel)
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

// Helper function to get next period
function getNextPeriod(currentPeriod: string, frequency: string): string {
  if (frequency === 'weekly') {
    const match = currentPeriod.match(/(\d{4})-W(\d{2})/);
    if (match) {
      const year = parseInt(match[1]);
      const week = parseInt(match[2]);
      const nextWeek = week + 1;
      if (nextWeek > 52) {
        return `${year + 1}-W01`;
      }
      return `${year}-W${nextWeek.toString().padStart(2, '0')}`;
    }
  } else if (frequency === 'biweekly') {
    const match = currentPeriod.match(/(\d{4})-BW(\d{2})/);
    if (match) {
      const year = parseInt(match[1]);
      const biweek = parseInt(match[2]);
      const nextBiweek = biweek + 1;
      if (nextBiweek > 26) {
        return `${year + 1}-BW01`;
      }
      return `${year}-BW${nextBiweek.toString().padStart(2, '0')}`;
    }
  } else if (frequency === 'monthly') {
    const match = currentPeriod.match(/(\d{4})-M(\d{2})/);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]);
      const nextMonth = month + 1;
      if (nextMonth > 12) {
        return `${year + 1}-M01`;
      }
      return `${year}-M${nextMonth.toString().padStart(2, '0')}`;
    }
  }
  
  return currentPeriod;
}

// Helper function to get room index for next period (same as admin panel)
function getNextRoomIndex(rotations: any[], nextPeriod: string, frequency: string): number {
  if (rotations.length === 0) return 0
  
  // Extract period number from period string
  let periodNumber = 0
  
  if (nextPeriod.includes('-W')) {
    // Weekly: 2024-W01 -> 1
    periodNumber = parseInt(nextPeriod.split('-W')[1])
  } else if (nextPeriod.includes('-BW')) {
    // Biweekly: 2024-BW01 -> 1
    periodNumber = parseInt(nextPeriod.split('-BW')[1])
  } else if (nextPeriod.includes('-M')) {
    // Monthly: 2024-M01 -> 1
    periodNumber = parseInt(nextPeriod.split('-M')[1])
  }
  
  // Use period number for deterministic rotation
  return (periodNumber - 1) % rotations.length
}

// Helper function to format period for display
function formatPeriod(period: string, frequency: string): string {
  if (frequency === 'weekly') {
    const match = period.match(/(\d{4})-W(\d{2})/);
    if (match) {
      const year = parseInt(match[1]);
      const week = parseInt(match[2]);
      const date = new Date(year, 0, 1 + (week - 1) * 7);
      const startDate = new Date(date.getTime() - date.getDay() * 24 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
      
      const startStr = startDate.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' });
      const endStr = endDate.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' });
      
      return `${startStr} - ${endStr} ${year}`;
    }
  } else if (frequency === 'biweekly') {
    const match = period.match(/(\d{4})-BW(\d{2})/);
    if (match) {
      const year = parseInt(match[1]);
      const biweek = parseInt(match[2]);
      const startWeek = (biweek - 1) * 2 + 1;
      const endWeek = biweek * 2;
      
      return `${year} - ${startWeek}. a ${endWeek}. týden`;
    }
  } else if (frequency === 'monthly') {
    const match = period.match(/(\d{4})-M(\d{2})/);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]);
      const monthName = new Date(year, month - 1).toLocaleDateString('cs-CZ', { month: 'long' });
      return `${monthName} ${year}`;
    }
  }
  
  return period;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[TEST] Starting weekly cleaning reminders test...');
    
    // Get all floors with cleaning settings and rotations (same as original endpoint)
    const floors = await prisma.floor.findMany({
      include: {
        cleaningRotations: {
          include: {
            room: {
              include: {
                users: true
              }
            }
          }
        },
        cleaningSettings: true
      }
    });

    const results: any[] = [];
    let totalSent = 0;
    let totalFailed = 0;

    for (const floor of floors) {
      if (!floor.cleaningRotations || floor.cleaningRotations.length === 0) {
        console.log(`Floor ${floor.number} has no cleaning rotations, skipping...`);
        continue;
      }

      const frequency = floor.cleaningSettings?.frequency || 'weekly';
      const currentPeriod = getCurrentPeriod(frequency);
      const nextPeriod = getNextPeriod(currentPeriod, frequency);
      
      // Get the room responsible for next period
      // For weekly reminders, we want the room that will be responsible NEXT week
      // We need to calculate the room index for the NEXT period, not current
      const nextRoomIndex = getNextRoomIndex(floor.cleaningRotations, nextPeriod, frequency);
      const nextRoom = floor.cleaningRotations[nextRoomIndex]?.room;
      
      console.log(`Floor ${floor.number}: Current period: ${currentPeriod}, Next period: ${nextPeriod}, Next room index: ${nextRoomIndex}, Next room: ${nextRoom?.name || 'None'}`);
      
      if (!nextRoom || !nextRoom.users || nextRoom.users.length === 0) {
        console.log(`Floor ${floor.number} has no responsible room for next period, skipping...`);
        continue;
      }

      // Send email to ALL responsible users for this floor
      if (nextRoom.users && nextRoom.users.length > 0) {
        const responsiblePeople = nextRoom.users.map(u => u.name).join(', ');
        const weekDate = formatPeriod(nextPeriod, frequency);
        
        // Send individual email to each responsible user
        for (const user of nextRoom.users) {
          if (!user.email) {
            console.log(`User ${user.name} has no email, skipping...`);
            continue;
          }
          
          const emailData: CleaningReminderData = {
            recipientEmail: user.email, // SKUTEČNÁ ADRESA
            recipientName: user.name,
            weekDate: weekDate,
            responsiblePeople: responsiblePeople,
            room: nextRoom.name,
            appLink: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/cleaning`,
            adminEmail: 'arbes@virtuex.cz'
          };

          console.log(`[TEST] Email data:`, {
            recipientEmail: emailData.recipientEmail,
            recipientName: emailData.recipientName,
            weekDate: emailData.weekDate,
            responsiblePeople: emailData.responsiblePeople,
            room: emailData.room
          });

          console.log(`[TEST] Sending reminder to ${user.email} (${user.name}) for Floor ${floor.number} - ${nextRoom.name} (${weekDate}) + CC to jajirka.kolb@gmail.com`);
          
          const success = await sendCleaningReminderEmail(emailData);
          
          results.push({
            floor: floor.name,
            room: nextRoom.name,
            user: user.name,
            email: user.email,
            period: nextPeriod,
            success: success
          });

          if (success) {
            totalSent++;
          } else {
            totalFailed++;
          }
        }
      }
    }

    console.log(`[TEST] ✅ Weekly reminders test completed!`);
    console.log(`[TEST] Total sent: ${totalSent}`);
    console.log(`[TEST] Total failed: ${totalFailed}`);

    return NextResponse.json({
      success: true,
      totalSent,
      totalFailed,
      results
    });

  } catch (error) {
    console.error('[TEST] Error sending weekly reminders:', error);
    return NextResponse.json(
      { error: 'Chyba při odesílání týdenních připomínek' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
