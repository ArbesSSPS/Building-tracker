const https = require('https');
const http = require('http');

const API_URL = 'http://localhost:3000/api/email/send-test-reminders';

console.log('[TEST] Sending weekly cleaning reminders to test email...');

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
      console.log('[TEST] ✅ Weekly reminders sent successfully!');
      console.log(`[TEST] Total sent: ${result.totalSent || 0}`);
      console.log(`[TEST] Total failed: ${result.totalFailed || 0}`);
      
      if (result.results && result.results.length > 0) {
        console.log('[TEST] Results:');
        result.results.forEach((item, index) => {
          const status = item.success ? '✅' : '❌';
          console.log(`[TEST]   ${status} ${item.user} (${item.email}) - ${item.room} - ${item.period}`);
        });
      }
      
      console.log('[TEST] Script completed successfully.');
    } catch (error) {
      console.error('[TEST] Error parsing response:', error);
      console.log('[TEST] Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('[TEST] Request error:', error);
});

req.end();
