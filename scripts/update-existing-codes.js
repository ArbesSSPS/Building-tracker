#!/usr/bin/env node

/**
 * Script to update existing registration codes with role field
 * 
 * This script will:
 * 1. Update all existing codes to have USER role by default
 * 2. Create new role-specific codes
 * 
 * Usage: node scripts/update-existing-codes.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

async function updateExistingCodes() {
  console.log('🔧 Updating existing registration codes...')
  console.log('')
  
  try {
    // Update existing codes to have USER role
    console.log('📋 Updating existing codes to USER role')
    const updateResult = await prisma.registrationCode.updateMany({
      where: { role: 'USER' }, // This will match all codes since they default to USER
      data: { role: 'USER' } // Explicitly set to USER
    })
    
    console.log(`   ✅ Updated ${updateResult.count} existing codes`)
    
    // Create new role-specific codes
    console.log('')
    console.log('📋 Creating new role-specific codes')
    
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    const roles = ['USER', 'ADMIN', 'SUPERADMIN']
    
    for (const role of roles) {
      const code = generateCode()
      const registrationCode = await prisma.registrationCode.create({
        data: {
          code,
          role,
          expiresAt
        }
      })
      console.log(`   ${role}: ${code}`)
    }
    
    console.log('')
    console.log('🎉 Code update completed successfully!')
    console.log('')
    console.log('📝 Summary:')
    console.log('   ✅ Existing codes updated with USER role')
    console.log('   ✅ New role-specific codes created')
    console.log('   ✅ All codes now have proper role assignments')
    
  } catch (error) {
    console.error('❌ Update failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the update
if (require.main === module) {
  updateExistingCodes()
    .then(() => {
      console.log(`[${new Date().toISOString()}] Update completed.`)
      process.exit(0)
    })
    .catch((error) => {
      console.error(`[${new Date().toISOString()}] Update failed:`, error)
      process.exit(1)
    })
}

module.exports = { updateExistingCodes }
