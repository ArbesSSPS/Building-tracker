#!/usr/bin/env node

console.log('🔮 PŘÍŠTÍ NEDĚLE - Komu se pošlou cleaning reminders');
console.log('='.repeat(60));
console.log('');

// Simulate what will happen NEXT Sunday (week 39)
const followingWeekData = [
  {
    floor: 'Přízemí',
    room: 'Kancelář A',
    users: [
      { name: 'Administrátor', email: 'admin@example.com' },
      { name: 'Tomáš Nový', email: 'user5@example.com' }
    ],
    period: '2025-W39',
    dateRange: '29. 9. - 5. 10. 2025'
  },
  {
    floor: 'První patro',
    room: '212',
    users: [
      { name: 'Anna Nová', email: 'user4@example.com' },
      { name: 'Pavel Malý', email: 'user7@example.com' }
    ],
    period: '2025-W39',
    dateRange: '29. 9. - 5. 10. 2025'
  },
  {
    floor: 'Patro 3',
    room: '315',
    users: [
      { name: 'Ondřej Velký', email: 'user11@example.com' }
    ],
    period: '2025-W39',
    dateRange: '29. 9. - 5. 10. 2025'
  }
];

console.log('📅 Období: 29. 9. - 5. 10. 2025 (týden 39)');
console.log('');

let totalEmails = 0;

followingWeekData.forEach((floorData, index) => {
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
console.log(`   Místností: ${followingWeekData.length}`);
console.log('');

console.log('📧 DETAILY EMAILŮ:');
console.log('   Každý email bude obsahovat:');
console.log('   - Datum: 29. 9. - 5. 10. 2025');
console.log('   - Odpovědní lidé: [všichni zodpovědní z místnosti]');
console.log('   - Místnost: [název místnosti]');
console.log('   - Odesílatel: Arbesovo Náměstí');
console.log('   - CC: jajirka.kolb@gmail.com');
console.log('');

console.log('⏰ KDY SE POŠLOU:');
console.log('   Neděle 29. 9. 2025 v 18:00 Prague time');
console.log('   (automaticky přes cron job)');
console.log('');

console.log('🔄 ROTACE:');
console.log('   Tento týden (22.-28.9.): Kancelář B, Kancelář D, 314');
console.log('   Příští týden (29.9.-5.10.): Kancelář A, 212, 315');
console.log('   Další týden (6.-12.10.): Kancelář B, Kancelář D, 314');
console.log('');

console.log('🔧 TESTOVÁNÍ:');
console.log('   Zobrazit tento týden: node scripts/show-next-week.js');
console.log('   Zobrazit příští týden: node scripts/show-following-week.js');
console.log('   Otestovat skutečné odesílání: node scripts/test-weekly-recipients.js');
console.log('   Spustit cvičný cron job: node scripts/send-weekly-reminders.js');
