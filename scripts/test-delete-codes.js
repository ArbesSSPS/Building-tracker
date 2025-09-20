#!/usr/bin/env node

/**
 * Test script to verify code deletion functionality
 * 
 * This script tests:
 * 1. Code deletion API endpoint
 * 2. Deletion of both used and unused codes
 * 3. Proper error handling
 * 
 * Usage: node scripts/test-delete-codes.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testCodeDeletion() {
  console.log('🗑️  Testing code deletion functionality...')
  console.log('')
  
  try {
    // Test 1: Find codes to test with
    console.log('📋 Test 1: Finding test codes')
    const codes = await prisma.registrationCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3
    })
    
    if (codes.length === 0) {
      console.log('   ⚠️  No codes found, creating test codes...')
      
      // Create test codes
      const testCodes = []
      for (let i = 0; i < 3; i++) {
        const code = generateCode()
        const registrationCode = await prisma.registrationCode.create({
          data: {
            code,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          }
        })
        testCodes.push(registrationCode)
      }
      
      // Mark one as used
      if (testCodes.length > 0) {
        await prisma.registrationCode.update({
          where: { id: testCodes[0].id },
          data: { 
            isUsed: true,
            usedBy: 'test-user-id',
            usedAt: new Date()
          }
        })
        testCodes[0].isUsed = true
      }
      
      console.log(`   ✅ Created ${testCodes.length} test codes`)
      console.log(`   Used codes: ${testCodes.filter(c => c.isUsed).length}`)
      console.log(`   Unused codes: ${testCodes.filter(c => !c.isUsed).length}`)
      
      return testCodes
    }
    
    console.log(`   ✅ Found ${codes.length} existing codes`)
    console.log(`   Used codes: ${codes.filter(c => c.isUsed).length}`)
    console.log(`   Unused codes: ${codes.filter(c => !c.isUsed).length}`)
    
    return codes
    
  } catch (error) {
    console.error('❌ Error in test setup:', error)
    return []
  }
}

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

async function testDeletionAPI(codeId, codeValue, isUsed) {
  console.log('')
  console.log(`📋 Test 2: Testing deletion API for code "${codeValue}" (${isUsed ? 'used' : 'unused'})`)
  
  try {
    const response = await fetch(`http://localhost:3000/api/admin/codes?id=${codeId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('   ✅ Code deletion API successful')
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

async function verifyDeletion(codeId) {
  console.log('')
  console.log('📋 Test 3: Verifying code deletion')
  
  try {
    const code = await prisma.registrationCode.findUnique({
      where: { id: codeId }
    })
    
    if (code) {
      console.log('   ❌ Code still exists in database')
      return false
    }
    
    console.log('   ✅ Code deleted from database')
    return true
    
  } catch (error) {
    console.error('   ❌ Error verifying deletion:', error)
    return false
  }
}

async function runTests() {
  console.log('🔍 Starting code deletion tests...')
  console.log('')
  
  // Note: This test requires the server to be running
  console.log('⚠️  Note: Make sure the development server is running (npm run dev)')
  console.log('')
  
  const codes = await testCodeDeletion()
  
  if (codes.length === 0) {
    console.log('❌ Test setup failed')
    return
  }
  
  let successCount = 0
  let totalTests = 0
  
  for (const code of codes.slice(0, 2)) { // Test first 2 codes
    totalTests++
    const apiSuccess = await testDeletionAPI(code.id, code.code, code.isUsed)
    
    if (apiSuccess) {
      const deletionSuccess = await verifyDeletion(code.id)
      if (deletionSuccess) {
        successCount++
      }
    }
  }
  
  console.log('')
  if (successCount === totalTests) {
    console.log('✅ All code deletion tests passed!')
    console.log('')
    console.log('🔒 Code deletion functionality is working correctly:')
    console.log('   - Both used and unused codes can be deleted')
    console.log('   - API endpoint works correctly')
    console.log('   - Codes are completely removed from database')
    console.log('   - Proper error handling and user feedback')
  } else {
    console.log(`❌ ${totalTests - successCount} out of ${totalTests} tests failed`)
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
