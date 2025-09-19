#!/usr/bin/env node

/**
 * Test script to see who will receive weekly cleaning reminders this Sunday
 * 
 * This script shows you exactly who will get emails without actually sending them
 * 
 * Usage: node scripts/test-weekly-recipients.js
 */

const https = require('https');
const http = require('http');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const ENDPOINT = '/api/email/send-weekly-reminders';

// Helper function to make HTTP request
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Main function
async function testWeeklyRecipients() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Testing weekly cleaning reminder recipients...`);
  console.log('');
  
  try {
    // Make request to the API endpoint
    const response = await makeRequest(`${API_URL}${ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Weekly-Recipients/1.0'
      }
    });
    
    if (response.status === 200) {
      console.log('✅ Weekly reminders test completed successfully!');
      console.log('');
      
      const results = response.data.results || [];
      const totalSent = response.data.totalSent || 0;
      const totalFailed = response.data.totalFailed || 0;
      
      console.log(`📊 Summary:`);
      console.log(`   Total emails that would be sent: ${totalSent}`);
      console.log(`   Failed emails: ${totalFailed}`);
      console.log('');
      
      if (results.length > 0) {
        console.log('📧 Recipients who will receive emails this Sunday:');
        console.log('');
        
        // Group by floor
        const byFloor = {};
        results.forEach(result => {
          if (!byFloor[result.floor]) {
            byFloor[result.floor] = [];
          }
          byFloor[result.floor].push(result);
        });
        
        Object.keys(byFloor).forEach(floor => {
          console.log(`🏢 ${floor}:`);
          byFloor[floor].forEach(result => {
            const status = result.success ? '✅' : '❌';
            console.log(`   ${status} ${result.user} (${result.email})`);
            console.log(`      📍 Room: ${result.room}`);
            console.log(`      📅 Period: ${result.period}`);
            console.log('');
          });
        });
        
        console.log('📋 Email details:');
        console.log('   Each email will contain:');
        console.log('   - Datum: [DATUM_TÝDNE] - The week period');
        console.log('   - Odpovědní lidé: [ODPOVĚDNÍ_LIDÉ] - All responsible people from the room');
        console.log('   - Místnost: [MÍSTNOST] - The room name');
        console.log('');
        
        // Show unique rooms and their responsible people
        const uniqueRooms = {};
        results.forEach(result => {
          if (!uniqueRooms[result.room]) {
            uniqueRooms[result.room] = {
              floor: result.floor,
              people: new Set(),
              period: result.period
            };
          }
          uniqueRooms[result.room].people.add(result.user);
        });
        
        console.log('🏠 Rooms responsible for cleaning next week:');
        Object.keys(uniqueRooms).forEach(room => {
          const roomData = uniqueRooms[room];
          const people = Array.from(roomData.people).join(', ');
          console.log(`   ${room} (${roomData.floor})`);
          console.log(`   👥 Responsible: ${people}`);
          console.log(`   📅 Period: ${roomData.period}`);
          console.log('');
        });
        
      } else {
        console.log('❌ No recipients found. This could mean:');
        console.log('   - No floors are configured with cleaning rotations');
        console.log('   - No users are assigned to responsible rooms');
        console.log('   - No users have email addresses');
        console.log('   - There are no responsible rooms for next week');
      }
      
    } else {
      console.error(`❌ Failed to test weekly reminders. Status: ${response.status}`);
      console.error(`Response:`, response.data);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`❌ Error testing weekly reminders:`, error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  testWeeklyRecipients()
    .then(() => {
      console.log(`[${new Date().toISOString()}] Test completed successfully.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(`[${new Date().toISOString()}] Test failed:`, error);
      process.exit(1);
    });
}

module.exports = { testWeeklyRecipients };
