const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Lokální databáze (SQLite)
const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./prisma/dev.db"
    }
  }
});

// Produkční databáze (PostgreSQL)
const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function migrateToProduction() {
  try {
    console.log('🔄 Začínám migraci dat z lokální do produkční databáze...');

    // 1. Vyčistit produkční databázi
    console.log('🧹 Čištění produkční databáze...');
    await prodPrisma.cleaningRecord.deleteMany();
    await prodPrisma.cleaningRotation.deleteMany();
    await prodPrisma.cleaningSettings.deleteMany();
    await prodPrisma.uncheckoutPenalty.deleteMany();
    await prodPrisma.activityLog.deleteMany();
    await prodPrisma.presence.deleteMany();
    await prodPrisma.registrationCode.deleteMany();
    await prodPrisma.user.deleteMany();
    await prodPrisma.room.deleteMany();
    await prodPrisma.floor.deleteMany();

    // 2. Načíst data z lokální databáze
    console.log('📥 Načítání dat z lokální databáze...');
    
    const floors = await localPrisma.floor.findMany();
    const rooms = await localPrisma.room.findMany();
    const users = await localPrisma.user.findMany();
    const cleaningSettings = await localPrisma.cleaningSettings.findMany();
    const cleaningRotations = await localPrisma.cleaningRotation.findMany();
    const cleaningRecords = await localPrisma.cleaningRecord.findMany();
    const registrationCodes = await localPrisma.registrationCode.findMany();

    // 3. Vytvořit data v produkční databázi
    console.log('📤 Vytváření dat v produkční databázi...');

    // Podlaží
    for (const floor of floors) {
      await prodPrisma.floor.create({
        data: {
          id: floor.id,
          number: floor.number,
          name: floor.name,
          createdAt: floor.createdAt,
          updatedAt: floor.updatedAt
        }
      });
    }
    console.log(`✅ Vytvořeno ${floors.length} podlaží`);

    // Místnosti
    for (const room of rooms) {
      await prodPrisma.room.create({
        data: {
          id: room.id,
          name: room.name,
          project: room.project,
          floorId: room.floorId,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt
        }
      });
    }
    console.log(`✅ Vytvořeno ${rooms.length} místností`);

    // Uživatelé
    for (const user of users) {
      await prodPrisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          lastName: user.lastName,
          password: user.password,
          role: user.role,
          roomId: user.roomId,
          alarmCode: user.alarmCode,
          resetToken: user.resetToken,
          resetTokenExpires: user.resetTokenExpires,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    }
    console.log(`✅ Vytvořeno ${users.length} uživatelů`);

    // Presence
    const presences = await localPrisma.presence.findMany();
    for (const presence of presences) {
      await prodPrisma.presence.create({
        data: {
          id: presence.id,
          userId: presence.userId,
          isPresent: presence.isPresent,
          lastSeen: presence.lastSeen,
          createdAt: presence.createdAt,
          updatedAt: presence.updatedAt
        }
      });
    }
    console.log(`✅ Vytvořeno ${presences.length} presence záznamů`);

    // Cleaning settings
    for (const setting of cleaningSettings) {
      await prodPrisma.cleaningSettings.create({
        data: {
          id: setting.id,
          floorId: setting.floorId,
          frequency: setting.frequency,
          pendingFrequency: setting.pendingFrequency,
          pendingFromPeriod: setting.pendingFromPeriod,
          createdAt: setting.createdAt,
          updatedAt: setting.updatedAt
        }
      });
    }
    console.log(`✅ Vytvořeno ${cleaningSettings.length} cleaning settings`);

    // Cleaning rotations
    for (const rotation of cleaningRotations) {
      await prodPrisma.cleaningRotation.create({
        data: {
          id: rotation.id,
          floorId: rotation.floorId,
          roomId: rotation.roomId,
          order: rotation.order,
          createdAt: rotation.createdAt,
          updatedAt: rotation.updatedAt
        }
      });
    }
    console.log(`✅ Vytvořeno ${cleaningRotations.length} cleaning rotations`);

    // Cleaning records
    for (const record of cleaningRecords) {
      await prodPrisma.cleaningRecord.create({
        data: {
          id: record.id,
          floorId: record.floorId,
          roomId: record.roomId,
          userId: record.userId,
          photos: record.photos,
          completedAt: record.completedAt,
          period: record.period,
          createdAt: record.createdAt
        }
      });
    }
    console.log(`✅ Vytvořeno ${cleaningRecords.length} cleaning records`);

    // Registration codes
    for (const code of registrationCodes) {
      await prodPrisma.registrationCode.create({
        data: {
          id: code.id,
          code: code.code,
          role: code.role,
          isUsed: code.isUsed,
          usedBy: code.usedBy,
          usedAt: code.usedAt,
          expiresAt: code.expiresAt,
          createdAt: code.createdAt,
          updatedAt: code.updatedAt
        }
      });
    }
    console.log(`✅ Vytvořeno ${registrationCodes.length} registration codes`);

    // Activity logs
    const activityLogs = await localPrisma.activityLog.findMany();
    for (const log of activityLogs) {
      await prodPrisma.activityLog.create({
        data: {
          id: log.id,
          userId: log.userId,
          action: log.action,
          timestamp: log.timestamp,
          createdAt: log.createdAt
        }
      });
    }
    console.log(`✅ Vytvořeno ${activityLogs.length} activity logs`);

    // Uncheckout penalties
    const penalties = await localPrisma.uncheckoutPenalty.findMany();
    for (const penalty of penalties) {
      await prodPrisma.uncheckoutPenalty.create({
        data: {
          id: penalty.id,
          userId: penalty.userId,
          date: penalty.date,
          createdAt: penalty.createdAt
        }
      });
    }
    console.log(`✅ Vytvořeno ${penalties.length} uncheckout penalties`);

    console.log('🎉 Migrace dokončena úspěšně!');
    
    // Zobrazit finální stav
    const finalUsers = await prodPrisma.user.findMany({
      select: { email: true, role: true, name: true }
    });
    console.log('\n📊 Finální uživatelé v produkční databázi:');
    finalUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role}) - ${user.name}`);
    });

  } catch (error) {
    console.error('❌ Chyba při migraci:', error);
  } finally {
    await localPrisma.$disconnect();
    await prodPrisma.$disconnect();
  }
}

migrateToProduction();
