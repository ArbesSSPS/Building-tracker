const https = require('https');
const http = require('http');

const API_URL = 'http://localhost:3000/api/email/send-weekly-reminders';

console.log('🔮 Checking who will receive cleaning reminders NEXT WEEK...');
console.log('');

// Make request to the API
const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(API_URL, options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.success) {
        console.log('✅ Next week cleaning reminders preview:');
        console.log('');
        
        // Group results by floor
        const floors = {};
        result.results.forEach(item => {
          if (!floors[item.floor]) {
            floors[item.floor] = [];
          }
          floors[item.floor].push(item);
        });
        
        // Display results by floor
        Object.keys(floors).forEach(floorName => {
          console.log(`🏢 ${floorName}:`);
          floors[floorName].forEach(item => {
            const status = item.success ? '✅' : '❌';
            console.log(`   ${status} ${item.user} (${item.email})`);
            console.log(`      📍 Room: ${item.room}`);
            console.log(`      📅 Period: ${item.period}`);
            console.log('');
          });
        });
        
        console.log('📊 Summary:');
        console.log(`   Total emails: ${result.totalSent || 0}`);
        console.log(`   Failed emails: ${result.totalFailed || 0}`);
        console.log('');
        
        // Show unique rooms
        const uniqueRooms = [...new Set(result.results.map(item => item.room))];
        console.log('🏠 Rooms responsible for cleaning next week:');
        uniqueRooms.forEach(room => {
          const roomUsers = result.results.filter(item => item.room === room);
          const responsiblePeople = roomUsers.map(u => u.user).join(', ');
          console.log(`   ${room} (${roomUsers[0].floor})`);
          console.log(`   👥 Responsible: ${responsiblePeople}`);
          console.log(`   📅 Period: ${roomUsers[0].period}`);
          console.log('');
        });
        
        console.log('📧 Email details:');
        console.log('   Each email will contain:');
        console.log('   - Datum: [DATUM_TÝDNE] - The week period');
        console.log('   - Odpovědní lidé: [ODPOVĚDNÍ_LIDÉ] - All responsible people from the room');
        console.log('   - Místnost: [MÍSTNOST] - The room name');
        console.log('   - Odesílatel: Arbesovo Náměstí');
        console.log('   - CC: jajirka.kolb@gmail.com');
        
      } else {
        console.log('❌ Error:', result.error || 'Unknown error');
      }
      
    } catch (error) {
      console.error('❌ Error parsing response:', error);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error);
});

req.end();
