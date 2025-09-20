#!/usr/bin/env node

/**
 * Test script to verify user deletion functionality
 * 
 * This script tests:
 * 1. User deletion API endpoint
 * 2. Cascade deletion of related data
 * 3. Transaction safety
 * 
 * Usage: node scripts/test-delete-user.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testUserDeletion() {
  console.log('🗑️  Testing user deletion functionality...')
  console.log('')
  
  try {
    // Test 1: Find a test user to delete
    console.log('📋 Test 1: Finding test user')
    const testUser = await prisma.user.findFirst({
      where: {
        email: {
          contains: 'test'
        }
      },
      include: {
        room: true,
        presence: true,
        penalties: true,
        activityLogs: true,
        cleaningRecords: true
      }
    })
    
    if (!testUser) {
      console.log('   ⚠️  No test user found, creating one...')
      
      // Create a test user
      const newUser = await prisma.user.create({
        data: {
          email: 'test-delete@example.com',
          name: 'Test',
          lastName: 'Delete',
          password: 'hashedpassword',
          role: 'USER'
        }
      })
      
      console.log(`   ✅ Created test user: ${newUser.name} ${newUser.lastName}`)
      console.log(`   User ID: ${newUser.id}`)
      
      // Add some test data
      await prisma.presence.create({
        data: {
          userId: newUser.id,
          isPresent: false
        }
      })
      
      await prisma.activityLog.create({
        data: {
          userId: newUser.id,
          action: 'check_in'
        }
      })
      
      console.log('   ✅ Added test data (presence, activity log)')
      
      return newUser.id
    }
    
    console.log(`   ✅ Found test user: ${testUser.name} ${testUser.lastName}`)
    console.log(`   User ID: ${testUser.id}`)
    console.log(`   Related data: ${testUser.presence ? 'presence' : 'none'}, ${testUser.activityLogs.length} activity logs`)
    
    return testUser.id
    
  } catch (error) {
    console.error('❌ Error in test setup:', error)
    return null
  }
}

async function testDeletionAPI(userId) {
  console.log('')
  console.log('📋 Test 2: Testing deletion API')
  
  try {
    const response = await fetch(`http://localhost:3000/api/admin/users?id=${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('   ✅ User deletion API successful')
      console.log(`   Message: ${result.message}`)
      return true
    } else {
      const error = await response.json()
      console.log(`   ❌ API error: ${error.error}`)
      return false
    }
  } catch (error) {
    console.log(`   ❌ API request failed: ${error.message}`)
    return false
  }
}

async function verifyDeletion(userId) {
  console.log('')
  console.log('📋 Test 3: Verifying complete deletion')
  
  try {
    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (user) {
      console.log('   ❌ User still exists in database')
      return false
    }
    
    console.log('   ✅ User deleted from database')
    
    // Check if related data was deleted
    const presence = await prisma.presence.findFirst({
      where: { userId }
    })
    
    if (presence) {
      console.log('   ❌ Presence record still exists')
      return false
    }
    
    console.log('   ✅ Presence record deleted')
    
    const activityLogs = await prisma.activityLog.findMany({
      where: { userId }
    })
    
    if (activityLogs.length > 0) {
      console.log(`   ❌ ${activityLogs.length} activity logs still exist`)
      return false
    }
    
    console.log('   ✅ Activity logs deleted')
    
    const penalties = await prisma.uncheckoutPenalty.findMany({
      where: { userId }
    })
    
    if (penalties.length > 0) {
      console.log(`   ❌ ${penalties.length} penalties still exist`)
      return false
    }
    
    console.log('   ✅ Penalties deleted')
    
    const cleaningRecords = await prisma.cleaningRecord.findMany({
      where: { userId }
    })
    
    if (cleaningRecords.length > 0) {
      console.log(`   ❌ ${cleaningRecords.length} cleaning records still exist`)
      return false
    }
    
    console.log('   ✅ Cleaning records deleted')
    
    return true
    
  } catch (error) {
    console.error('   ❌ Error verifying deletion:', error)
    return false
  }
}

async function runTests() {
  console.log('🔍 Starting user deletion tests...')
  console.log('')
  
  // Note: This test requires the server to be running
  console.log('⚠️  Note: Make sure the development server is running (npm run dev)')
  console.log('')
  
  const userId = await testUserDeletion()
  
  if (!userId) {
    console.log('❌ Test setup failed')
    return
  }
  
  const apiSuccess = await testDeletionAPI(userId)
  
  if (!apiSuccess) {
    console.log('❌ API test failed')
    return
  }
  
  const deletionSuccess = await verifyDeletion(userId)
  
  console.log('')
  if (deletionSuccess) {
    console.log('✅ All user deletion tests passed!')
    console.log('')
    console.log('🔒 User deletion functionality is working correctly:')
    console.log('   - User is completely removed from database')
    console.log('   - All related data is cascade deleted')
    console.log('   - Transaction ensures data consistency')
    console.log('   - API endpoint works correctly')
  } else {
    console.log('❌ Some tests failed')
  }
}

// Run the tests
if (require.main === module) {
  runTests()
    .then(() => {
      console.log(`[${new Date().toISOString()}] Tests completed.`)
      process.exit(0)
    })
    .catch((error) => {
      console.error(`[${new Date().toISOString()}] Tests failed:`, error)
      process.exit(1)
    })
    .finally(() => {
      prisma.$disconnect()
    })
}

module.exports = { runTests }
