#!/usr/bin/env node

/**
 * Migration script to encrypt existing alarm codes in the database
 * 
 * This script will:
 * 1. Find all users with unencrypted alarm codes
 * 2. Encrypt their alarm codes
 * 3. Update the database with encrypted values
 * 
 * Usage: node scripts/migrate-alarm-codes.js
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
      return null // Not encrypted format
    }
    
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    return null // Not encrypted format
  }
}

/**
 * Checks if a string is already encrypted
 */
function isEncrypted(text) {
  if (!text) return false
  return text.includes(':') && text.split(':').length === 2
}

/**
 * Validates if a string is a valid 4-digit alarm code
 */
function isValidAlarmCode(code) {
  return /^\d{4}$/.test(code)
}

async function migrateAlarmCodes() {
  console.log('🔐 Starting alarm codes migration...')
  console.log('')
  
  try {
    // Find all users with alarm codes
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
    
    console.log(`📊 Found ${users.length} users with alarm codes`)
    console.log('')
    
    if (users.length === 0) {
      console.log('✅ No users with alarm codes found. Migration complete.')
      return
    }
    
    let migrated = 0
    let alreadyEncrypted = 0
    let invalid = 0
    let errors = 0
    
    for (const user of users) {
      try {
        console.log(`👤 Processing user: ${user.name} (${user.email})`)
        
        // Check if already encrypted
        if (isEncrypted(user.alarmCode)) {
          console.log(`   ⚠️  Already encrypted, skipping`)
          alreadyEncrypted++
          continue
        }
        
        // Validate alarm code format
        if (!isValidAlarmCode(user.alarmCode)) {
          console.log(`   ❌ Invalid alarm code format: ${user.alarmCode}`)
          invalid++
          continue
        }
        
        // Encrypt the alarm code
        const encryptedCode = encrypt(user.alarmCode)
        
        // Update user with encrypted code
        await prisma.user.update({
          where: { id: user.id },
          data: { alarmCode: encryptedCode }
        })
        
        console.log(`   ✅ Encrypted: ${user.alarmCode} -> ${encryptedCode.substring(0, 20)}...`)
        migrated++
        
      } catch (error) {
        console.log(`   ❌ Error processing user ${user.name}: ${error.message}`)
        errors++
      }
    }
    
    console.log('')
    console.log('📊 Migration Summary:')
    console.log(`   ✅ Successfully migrated: ${migrated}`)
    console.log(`   ⚠️  Already encrypted: ${alreadyEncrypted}`)
    console.log(`   ❌ Invalid codes: ${invalid}`)
    console.log(`   💥 Errors: ${errors}`)
    console.log('')
    
    if (migrated > 0) {
      console.log('✅ Migration completed successfully!')
      console.log('')
      console.log('🔒 All alarm codes are now encrypted in the database.')
      console.log('💡 Make sure to set ENCRYPTION_KEY environment variable in production!')
    } else {
      console.log('ℹ️  No codes needed migration.')
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
if (require.main === module) {
  migrateAlarmCodes()
    .then(() => {
      console.log(`[${new Date().toISOString()}] Migration completed.`)
      process.exit(0)
    })
    .catch((error) => {
      console.error(`[${new Date().toISOString()}] Migration failed:`, error)
      process.exit(1)
    })
}

module.exports = { migrateAlarmCodes }
