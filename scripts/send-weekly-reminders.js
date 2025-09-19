#!/usr/bin/env node

/**
 * Weekly Cleaning Reminders Cron Job
 * 
 * This script should be run every Sunday at 18:00 Prague time
 * 
 * To set up the cron job, add this line to your crontab:
 * 0 18 * * 0 cd /path/to/building-tracker && node scripts/send-weekly-reminders.js
 * 
 * Or for testing, you can run it manually:
 * node scripts/send-weekly-reminders.js
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
async function sendWeeklyReminders() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Starting weekly cleaning reminders...`);
  
  try {
    // Check if it's actually Sunday (optional safety check)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    if (dayOfWeek !== 0) {
      console.log(`[${timestamp}] Warning: Today is not Sunday (day ${dayOfWeek}), but continuing anyway...`);
    }
    
    // Make request to the API endpoint
    const response = await makeRequest(`${API_URL}${ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Weekly-Reminders-Cron/1.0'
      }
    });
    
    if (response.status === 200) {
      console.log(`[${timestamp}] ✅ Weekly reminders sent successfully!`);
      console.log(`[${timestamp}] Total sent: ${response.data.totalSent || 0}`);
      console.log(`[${timestamp}] Total failed: ${response.data.totalFailed || 0}`);
      
      if (response.data.results && response.data.results.length > 0) {
        console.log(`[${timestamp}] Results:`);
        response.data.results.forEach(result => {
          const status = result.success ? '✅' : '❌';
          console.log(`[${timestamp}]   ${status} ${result.user} (${result.email}) - ${result.room} - ${result.period}`);
        });
      }
    } else {
      console.error(`[${timestamp}] ❌ Failed to send weekly reminders. Status: ${response.status}`);
      console.error(`[${timestamp}] Response:`, response.data);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`[${timestamp}] ❌ Error sending weekly reminders:`, error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  sendWeeklyReminders()
    .then(() => {
      console.log(`[${new Date().toISOString()}] Script completed successfully.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(`[${new Date().toISOString()}] Script failed:`, error);
      process.exit(1);
    });
}

module.exports = { sendWeeklyReminders };
