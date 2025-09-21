const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

// Lokální databáze (SQLite)
const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./dev.db"
    }
  }
});

async function exportLocalData() {
  try {
    console.log('📥 Exportuji data z lokální databáze...');

    const data = {
      floors: await localPrisma.floor.findMany(),
      rooms: await localPrisma.room.findMany(),
      users: await localPrisma.user.findMany(),
      presences: await localPrisma.presence.findMany(),
      cleaningSettings: await localPrisma.cleaningSettings.findMany(),
      cleaningRotations: await localPrisma.cleaningRotation.findMany(),
      cleaningRecords: await localPrisma.cleaningRecord.findMany(),
      registrationCodes: await localPrisma.registrationCode.findMany(),
      activityLogs: await localPrisma.activityLog.findMany(),
      uncheckoutPenalties: await localPrisma.uncheckoutPenalty.findMany()
    };

    // Uložit do JSON souboru
    fs.writeFileSync('local-data.json', JSON.stringify(data, null, 2));
    
    console.log('✅ Data exportována do local-data.json');
    console.log(`📊 Exportováno:`);
    console.log(`- ${data.floors.length} podlaží`);
    console.log(`- ${data.rooms.length} místností`);
    console.log(`- ${data.users.length} uživatelů`);
    console.log(`- ${data.presences.length} presence záznamů`);
    console.log(`- ${data.cleaningSettings.length} cleaning settings`);
    console.log(`- ${data.cleaningRotations.length} cleaning rotations`);
    console.log(`- ${data.cleaningRecords.length} cleaning records`);
    console.log(`- ${data.registrationCodes.length} registration codes`);
    console.log(`- ${data.activityLogs.length} activity logs`);
    console.log(`- ${data.uncheckoutPenalties.length} uncheckout penalties`);

    // Zobrazit uživatele
    console.log('\n👥 Uživatelé v lokální databázi:');
    data.users.forEach(user => {
      console.log(`- ${user.email} (${user.role}) - ${user.name}`);
    });

  } catch (error) {
    console.error('❌ Chyba při exportu:', error);
  } finally {
    await localPrisma.$disconnect();
  }
}

exportLocalData();
