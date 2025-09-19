import { NextRequest, NextResponse } from 'next/server';
import { sendCleaningReminderEmail, CleaningReminderData } from '@/lib/email';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to get current period based on frequency
function getCurrentPeriod(frequency: string): string {
  const now = new Date();
  const year = now.getFullYear();
  
  if (frequency === 'weekly') {
    // Get ISO week number
    const start = new Date(year, 0, 1);
    const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + start.getDay() + 1) / 7);
    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
  } else if (frequency === 'biweekly') {
    const start = new Date(year, 0, 1);
    const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + start.getDay() + 1) / 7);
    const biweekNumber = Math.ceil(weekNumber / 2);
    return `${year}-BW${biweekNumber.toString().padStart(2, '0')}`;
  } else if (frequency === 'monthly') {
    const month = now.getMonth() + 1;
    return `${year}-M${month.toString().padStart(2, '0')}`;
  }
  
  return `${year}-W01`;
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

// Helper function to get room index for next period
function getNextRoomIndex(rotations: any[], currentPeriod: string, frequency: string): number {
  if (!Array.isArray(rotations) || rotations.length === 0) return 0;

  let periodNumber = 1;
  if (currentPeriod.includes('-W')) {
    const part = currentPeriod.split('-W')[1];
    periodNumber = parseInt(part || '1', 10) || 1;
  } else if (currentPeriod.includes('-BW')) {
    const part = currentPeriod.split('-BW')[1];
    periodNumber = parseInt(part || '1', 10) || 1;
  } else if (currentPeriod.includes('-M')) {
    const part = currentPeriod.split('-M')[1];
    periodNumber = parseInt(part || '1', 10) || 1;
  }

  const idx = periodNumber % rotations.length;
  return idx < 0 ? 0 : idx;
}

// Helper function to format period for display
function formatPeriod(period: string, frequency: string): string {
  if (frequency === 'weekly') {
    const match = period.match(/(\d{4})-W(\d{2})/);
    if (match) {
      const year = parseInt(match[1]);
      const week = parseInt(match[2]);
      
      // Calculate start and end of week (Monday to Sunday)
      const jan4 = new Date(year, 0, 4);
      const jan4Day = jan4.getDay() || 7;
      const mondayOfWeek1 = new Date(jan4.getTime() - (jan4Day - 1) * 24 * 60 * 60 * 1000);
      const weekStart = new Date(mondayOfWeek1.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
      
      return `${weekStart.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}. - ${weekEnd.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })}.`;
    }
  } else if (frequency === 'biweekly') {
    const match = period.match(/(\d{4})-BW(\d{2})/);
    if (match) {
      const year = parseInt(match[1]);
      const biweek = parseInt(match[2]);
      const weekStart = new Date(year, 0, 1);
      const biweekStart = new Date(weekStart.getTime() + (biweek - 1) * 14 * 24 * 60 * 60 * 1000);
      const biweekEnd = new Date(biweekStart.getTime() + 13 * 24 * 60 * 60 * 1000);
      
      return `${biweekStart.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}. - ${biweekEnd.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })}.`;
    }
  } else if (frequency === 'monthly') {
    const match = period.match(/(\d{4})-M(\d{2})/);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      
      return `${monthStart.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}. - ${monthEnd.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })}.`;
    }
  }
  
  return period;
}

// POST /api/email/send-weekly-reminders - Automatické posílání týdenních připomínek
export async function POST(request: NextRequest) {
  try {
    console.log('Starting weekly cleaning reminders...');
    
    // Get all floors with cleaning settings
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

    const results = [];
    
    for (const floor of floors) {
      if (!floor.cleaningRotations || floor.cleaningRotations.length === 0) {
        console.log(`Floor ${floor.number} has no cleaning rotations, skipping...`);
        continue;
      }

      const frequency = floor.cleaningSettings?.frequency || 'weekly';
      const currentPeriod = getCurrentPeriod(frequency);
      const nextPeriod = getNextPeriod(currentPeriod, frequency);
      
      // Get the room responsible for next period
      const nextRoomIndex = getNextRoomIndex(floor.cleaningRotations, nextPeriod, frequency);
      const nextRoom = floor.cleaningRotations[nextRoomIndex]?.room;
      
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
            recipientEmail: user.email,
            recipientName: user.name,
            weekDate: weekDate,
            responsiblePeople: responsiblePeople,
            room: nextRoom.name,
            appLink: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/cleaning`,
            adminEmail: 'arbes@virtuex.cz'
          };

          console.log(`Sending reminder to ${user.email} (${user.name}) for Floor ${floor.number} - ${nextRoom.name} (${weekDate})`);
          
          const success = await sendCleaningReminderEmail(emailData);
          
          results.push({
            floor: floor.name,
            room: nextRoom.name,
            user: user.name,
            email: user.email,
            period: nextPeriod,
            success: success
          });
        }
      }
    }

    console.log('Weekly reminders completed:', results);
    
    return NextResponse.json({
      message: 'Weekly reminders sent successfully',
      results: results,
      totalSent: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length
    });

  } catch (error) {
    console.error('Error sending weekly reminders:', error);
    return NextResponse.json(
      { error: 'Failed to send weekly reminders', details: error },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET /api/email/send-weekly-reminders - Test endpoint (manual trigger)
export async function GET() {
  try {
    console.log('Manual trigger of weekly reminders...');
    
    // Call the POST handler
    const response = await POST(new NextRequest('http://localhost:3000/api/email/send-weekly-reminders', {
      method: 'POST'
    }));
    
    return response;
  } catch (error) {
    console.error('Error in manual trigger:', error);
    return NextResponse.json(
      { error: 'Failed to trigger weekly reminders', details: error },
      { status: 500 }
    );
  }
}
