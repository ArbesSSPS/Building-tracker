#!/usr/bin/env node

/**
 * Test script pro cron job - týdenní připomínky úklidu
 * 
 * Tento script testuje, jestli cron job funguje správně
 * Spustí se: node scripts/test-cron-job.js
 */

const { sendWeeklyReminders } = require('./send-weekly-reminders.js');

console.log('🧪 Testování cron jobu pro týdenní připomínky...');
console.log('📅 Datum:', new Date().toLocaleString('cs-CZ'));
console.log('');

sendWeeklyReminders()
  .then(() => {
    console.log('');
    console.log('✅ Test dokončen úspěšně!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Test selhal:', error.message);
    process.exit(1);
  });
