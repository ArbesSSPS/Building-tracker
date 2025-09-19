#!/usr/bin/env node

console.log('🔮 PŘÍŠTÍ TÝDEN - Komu se pošlou cleaning reminders');
console.log('='.repeat(60));
console.log('');

// Simulate the data that would be sent
const nextWeekData = [
  {
    floor: 'Přízemí',
    room: 'Kancelář B',
    users: [
      { name: 'Jan Novák', email: 'user1@example.com' },
      { name: 'Eva Krásná', email: 'user6@example.com' }
    ],
    period: '2025-W38',
    dateRange: '22. 9. - 28. 9. 2025'
  },
  {
    floor: 'První patro',
    room: 'Kancelář D',
    users: [
      { name: 'Martin Střední', email: 'user9@example.com' }
    ],
    period: '2025-W38',
    dateRange: '22. 9. - 28. 9. 2025'
  },
  {
    floor: 'Patro 3',
    room: '314',
    users: [
      { name: 'Lucie Malá', email: 'user10@example.com' }
    ],
    period: '2025-W38',
    dateRange: '22. 9. - 28. 9. 2025'
  }
];

console.log('📅 Období: 22. 9. - 28. 9. 2025 (týden 38)');
console.log('');

let totalEmails = 0;

nextWeekData.forEach((floorData, index) => {
  console.log(`🏢 ${floorData.floor}:`);
  console.log(`   📍 Místnost: ${floorData.room}`);
  console.log(`   👥 Zodpovědní lidé:`);
  
  floorData.users.forEach(user => {
    console.log(`      ✅ ${user.name} (${user.email})`);
    totalEmails++;
  });
  
  console.log(`   📅 Období: ${floorData.dateRange}`);
  console.log('');
});

console.log('📊 SOUHRN:');
console.log(`   Celkem emailů: ${totalEmails}`);
console.log(`   Místností: ${nextWeekData.length}`);
console.log('');

console.log('📧 DETAILY EMAILŮ:');
console.log('   Každý email bude obsahovat:');
console.log('   - Datum: 22. 9. - 28. 9. 2025');
console.log('   - Odpovědní lidé: [všichni zodpovědní z místnosti]');
console.log('   - Místnost: [název místnosti]');
console.log('   - Odesílatel: Arbesovo Náměstí');
console.log('   - CC: jajirka.kolb@gmail.com');
console.log('');

console.log('⏰ KDY SE POŠLOU:');
console.log('   Neděle v 18:00 Prague time');
console.log('   (automaticky přes cron job)');
console.log('');

console.log('🔧 TESTOVÁNÍ:');
console.log('   Zobrazit tento přehled: node scripts/show-next-week.js');
console.log('   Otestovat skutečné odesílání: node scripts/test-weekly-recipients.js');
console.log('   Spustit cvičný cron job: node scripts/send-weekly-reminders.js');
