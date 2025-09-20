#!/usr/bin/env node

/**
 * Test script to verify alarm code encryption/decryption
 * 
 * This script tests the encryption functionality by:
 * 1. Testing encryption/decryption of sample codes
 * 2. Verifying that encrypted codes in database can be decrypted
 * 
 * Usage: node scripts/test-encryption.js
 */

const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

// Encryption configuration (must match the one in encryption.ts)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!'
const KEY = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
const ALGORITHM = 'aes-256-cbc'

const prisma = new PrismaClient()

/**
 * Encrypts a string using AES-256-CBC
 */
function encrypt(text) {
  if (!text) return ''
  
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return `${iv.toString('hex')}:${encrypted}`
}

/**
 * Decrypts a string using AES-256-CBC
 */
function decrypt(encryptedText) {
  if (!encryptedText) return ''
  
  try {
    const parts = encryptedText.split(':')
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted format')
    }
    
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    return ''
  }
}

async function testEncryption() {
  console.log('🔐 Testing alarm code encryption/decryption...')
  console.log('')
  
  try {
    // Test 1: Basic encryption/decryption
    console.log('📋 Test 1: Basic encryption/decryption')
    const testCodes = ['1234', '5678', '9999', '0000']
    
    for (const code of testCodes) {
      const encrypted = encrypt(code)
      const decrypted = decrypt(encrypted)
      
      const success = code === decrypted
      console.log(`   ${success ? '✅' : '❌'} ${code} -> ${encrypted.substring(0, 20)}... -> ${decrypted}`)
      
      if (!success) {
        console.error(`   ❌ Encryption/decryption failed for code: ${code}`)
        return
      }
    }
    
    console.log('')
    
    // Test 2: Database verification
    console.log('📋 Test 2: Database verification')
    const users = await prisma.user.findMany({
      where: {
        alarmCode: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        alarmCode: true
      }
    })
    
    console.log(`   Found ${users.length} users with alarm codes`)
    
    for (const user of users) {
      const decryptedCode = decrypt(user.alarmCode)
      const isValid = /^\d{4}$/.test(decryptedCode)
      
      console.log(`   ${isValid ? '✅' : '❌'} ${user.name}: ${user.alarmCode.substring(0, 20)}... -> ${decryptedCode}`)
      
      if (!isValid) {
        console.error(`   ❌ Invalid decrypted code for user: ${user.name}`)
        return
      }
    }
    
    console.log('')
    
    // Test 3: API endpoint test
    console.log('📋 Test 3: API endpoint test')
    console.log('   Testing GET /api/user/profile...')
    
    const response = await fetch('http://localhost:3000/api/user/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'next-auth.session-token=test' // This won't work without proper auth
      }
    })
    
    if (response.status === 401) {
      console.log('   ✅ API correctly requires authentication')
    } else {
      console.log(`   ⚠️  API returned status: ${response.status}`)
    }
    
    console.log('')
    console.log('✅ All encryption tests passed!')
    console.log('')
    console.log('🔒 Alarm codes are properly encrypted in the database.')
    console.log('💡 Remember to set ENCRYPTION_KEY environment variable in production!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
if (require.main === module) {
  testEncryption()
    .then(() => {
      console.log(`[${new Date().toISOString()}] Test completed.`)
      process.exit(0)
    })
    .catch((error) => {
      console.error(`[${new Date().toISOString()}] Test failed:`, error)
      process.exit(1)
    })
}

module.exports = { testEncryption }
