import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create floors
  const floor1 = await prisma.floor.upsert({
    where: { number: 1 },
    update: {},
    create: {
      number: 1,
      name: 'Přízemí'
    }
  })

  const floor2 = await prisma.floor.upsert({
    where: { number: 2 },
    update: {},
    create: {
      number: 2,
      name: 'První patro'
    }
  })

  // Create rooms
  let room1 = await prisma.room.findFirst({
    where: { 
      name: 'Kancelář A',
      floorId: floor1.id
    }
  })
  if (!room1) {
    room1 = await prisma.room.create({
      data: {
        name: 'Kancelář A',
        floorId: floor1.id
      }
    })
  }

  let room2 = await prisma.room.findFirst({
    where: { 
      name: 'Kancelář B',
      floorId: floor1.id
    }
  })
  if (!room2) {
    room2 = await prisma.room.create({
      data: {
        name: 'Kancelář B',
        floorId: floor1.id
      }
    })
  }

  let room3 = await prisma.room.findFirst({
    where: { 
      name: 'Kancelář C',
      floorId: floor2.id
    }
  })
  if (!room3) {
    room3 = await prisma.room.create({
      data: {
        name: 'Kancelář C',
        floorId: floor2.id
      }
    })
  }

  let room4 = await prisma.room.findFirst({
    where: { 
      name: 'Kancelář D',
      floorId: floor2.id
    }
  })
  if (!room4) {
    room4 = await prisma.room.create({
      data: {
        name: 'Kancelář D',
        floorId: floor2.id
      }
    })
  }

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Administrátor',
      password: hashedPassword,
      role: 'ADMIN',
      roomId: room1.id
    }
  })

  const user1 = await prisma.user.upsert({
    where: { email: 'user1@example.com' },
    update: {},
    create: {
      email: 'user1@example.com',
      name: 'Jan Novák',
      password: hashedPassword,
      role: 'USER',
      roomId: room1.id
    }
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'user2@example.com' },
    update: {},
    create: {
      email: 'user2@example.com',
      name: 'Marie Svobodová',
      password: hashedPassword,
      role: 'USER',
      roomId: room2.id
    }
  })

  const user3 = await prisma.user.upsert({
    where: { email: 'user3@example.com' },
    update: {},
    create: {
      email: 'user3@example.com',
      name: 'Petr Dvořák',
      password: hashedPassword,
      role: 'USER',
      roomId: room3.id
    }
  })

  const user4 = await prisma.user.upsert({
    where: { email: 'user4@example.com' },
    update: {},
    create: {
      email: 'user4@example.com',
      name: 'Anna Nová',
      password: hashedPassword,
      role: 'USER',
      roomId: room4.id
    }
  })

  // Create cleaning settings
  await prisma.cleaningSettings.create({
    data: {
      floorId: floor1.id,
      frequency: 'weekly'
    }
  })

  await prisma.cleaningSettings.create({
    data: {
      floorId: floor2.id,
      frequency: 'biweekly'
    }
  })

  // Create cleaning rotations
  await prisma.cleaningRotation.create({
    data: {
      floorId: floor1.id,
      roomId: room1.id,
      order: 0
    }
  })

  await prisma.cleaningRotation.create({
    data: {
      floorId: floor1.id,
      roomId: room2.id,
      order: 1
    }
  })

  await prisma.cleaningRotation.create({
    data: {
      floorId: floor2.id,
      roomId: room3.id,
      order: 0
    }
  })

  await prisma.cleaningRotation.create({
    data: {
      floorId: floor2.id,
      roomId: room4.id,
      order: 1
    }
  })

  // Create presence records for all users
  await prisma.presence.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      isPresent: false,
      lastSeen: new Date()
    }
  })

  await prisma.presence.upsert({
    where: { userId: user1.id },
    update: {},
    create: {
      userId: user1.id,
      isPresent: true,
      lastSeen: new Date()
    }
  })

  await prisma.presence.upsert({
    where: { userId: user2.id },
    update: {},
    create: {
      userId: user2.id,
      isPresent: false,
      lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    }
  })

  await prisma.presence.upsert({
    where: { userId: user3.id },
    update: {},
    create: {
      userId: user3.id,
      isPresent: false,
      lastSeen: new Date()
    }
  })

  await prisma.presence.upsert({
    where: { userId: user4.id },
    update: {},
    create: {
      userId: user4.id,
      isPresent: false,
      lastSeen: new Date()
    }
  })

  // Create some activity logs
  await prisma.activityLog.create({
    data: {
      userId: user1.id,
      action: 'check_in',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
    }
  })

  await prisma.activityLog.create({
    data: {
      userId: user2.id,
      action: 'check_in',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
    }
  })

  await prisma.activityLog.create({
    data: {
      userId: user2.id,
      action: 'check_out',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    }
  })

  // Create some cleaning records
  await prisma.cleaningRecord.create({
    data: {
      floorId: floor1.id,
      roomId: room1.id,
      userId: user1.id,
      photos: JSON.stringify(['photo1.jpg', 'photo2.jpg', 'photo3.jpg']),
      period: '2024-W01',
      completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
    }
  })

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })