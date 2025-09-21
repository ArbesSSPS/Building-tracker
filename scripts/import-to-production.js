const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

// Produkční databáze (PostgreSQL)
const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function importToProduction() {
  try {
    console.log('📥 Importuji data do produkční databáze...');

    // Načíst data z JSON souboru
    const data = JSON.parse(fs.readFileSync('local-data.json', 'utf8'));

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

    // 2. Importovat data
    console.log('📤 Importuji data...');

    // Podlaží
    for (const floor of data.floors) {
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
    console.log(`✅ Importováno ${data.floors.length} podlaží`);

    // Místnosti
    for (const room of data.rooms) {
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
    console.log(`✅ Importováno ${data.rooms.length} místností`);

    // Uživatelé
    for (const user of data.users) {
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
    console.log(`✅ Importováno ${data.users.length} uživatelů`);

    // Presence
    for (const presence of data.presences) {
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
    console.log(`✅ Importováno ${data.presences.length} presence záznamů`);

    // Cleaning settings
    for (const setting of data.cleaningSettings) {
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
    console.log(`✅ Importováno ${data.cleaningSettings.length} cleaning settings`);

    // Cleaning rotations
    for (const rotation of data.cleaningRotations) {
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
    console.log(`✅ Importováno ${data.cleaningRotations.length} cleaning rotations`);

    // Cleaning records
    for (const record of data.cleaningRecords) {
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
    console.log(`✅ Importováno ${data.cleaningRecords.length} cleaning records`);

    // Registration codes
    for (const code of data.registrationCodes) {
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
    console.log(`✅ Importováno ${data.registrationCodes.length} registration codes`);

    // Activity logs
    for (const log of data.activityLogs) {
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
    console.log(`✅ Importováno ${data.activityLogs.length} activity logs`);

    // Uncheckout penalties
    for (const penalty of data.uncheckoutPenalties) {
      await prodPrisma.uncheckoutPenalty.create({
        data: {
          id: penalty.id,
          userId: penalty.userId,
          date: penalty.date,
          createdAt: penalty.createdAt
        }
      });
    }
    console.log(`✅ Importováno ${data.uncheckoutPenalties.length} uncheckout penalties`);

    console.log('🎉 Import dokončen úspěšně!');
    
    // Zobrazit finální stav
    const finalUsers = await prodPrisma.user.findMany({
      select: { email: true, role: true, name: true }
    });
    console.log('\n📊 Finální uživatelé v produkční databázi:');
    finalUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role}) - ${user.name}`);
    });

  } catch (error) {
    console.error('❌ Chyba při importu:', error);
  } finally {
    await prodPrisma.$disconnect();
  }
}

importToProduction();
