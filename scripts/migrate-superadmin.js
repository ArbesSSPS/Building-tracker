#!/usr/bin/env node

/**
 * Migration script to add SUPERADMIN role and create superadmin user
 * 
 * This script will:
 * 1. Update the database schema to include SUPERADMIN role
 * 2. Create a superadmin user account
 * 3. Generate a superadmin invite code
 * 
 * Usage: node scripts/migrate-superadmin.js
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

async function migrateSuperadmin() {
  console.log('🔧 Starting SUPERADMIN migration...')
  console.log('')
  
  try {
    // Check if superadmin already exists
    const existingSuperadmin = await prisma.user.findFirst({
      where: { role: 'SUPERADMIN' }
    })
    
    if (existingSuperadmin) {
      console.log('✅ SUPERADMIN user already exists')
      console.log(`   Email: ${existingSuperadmin.email}`)
      console.log(`   Name: ${existingSuperadmin.name} ${existingSuperadmin.lastName || ''}`)
      return
    }
    
    // Create superadmin user
    console.log('📋 Creating SUPERADMIN user...')
    
    const hashedPassword = await bcrypt.hash('superadmin123', 10)
    
    const superadmin = await prisma.user.create({
      data: {
        email: 'superadmin@building-tracker.com',
        name: 'Super',
        lastName: 'Admin',
        password: hashedPassword,
        role: 'SUPERADMIN'
      }
    })
    
    console.log('✅ SUPERADMIN user created successfully!')
    console.log(`   Email: ${superadmin.email}`)
    console.log(`   Name: ${superadmin.name} ${superadmin.lastName}`)
    console.log(`   Password: superadmin123`)
    console.log('')
    
    // Generate superadmin invite code
    console.log('📋 Generating SUPERADMIN invite code...')
    
    const inviteCode = generateCode()
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    
    const code = await prisma.registrationCode.create({
      data: {
        code: inviteCode,
        expiresAt,
        // Note: We'll add role field later
      }
    })
    
    console.log('✅ SUPERADMIN invite code generated!')
    console.log(`   Code: ${code.code}`)
    console.log(`   Expires: ${expiresAt.toLocaleDateString('cs-CZ')}`)
    console.log('')
    
    // Create additional invite codes for different roles
    console.log('📋 Generating role-specific invite codes...')
    
    const roleCodes = []
    const roles = ['USER', 'ADMIN']
    
    for (const role of roles) {
      const roleCode = generateCode()
      const roleCodeRecord = await prisma.registrationCode.create({
        data: {
          code: roleCode,
          expiresAt,
          // Note: We'll add role field later
        }
      })
      roleCodes.push({ role, code: roleCodeRecord.code })
    }
    
    console.log('✅ Role-specific invite codes generated!')
    roleCodes.forEach(({ role, code }) => {
      console.log(`   ${role}: ${code}`)
    })
    
    console.log('')
    console.log('🎉 SUPERADMIN migration completed successfully!')
    console.log('')
    console.log('🔐 Superadmin credentials:')
    console.log('   Email: superadmin@building-tracker.com')
    console.log('   Password: superadmin123')
    console.log('')
    console.log('📝 Next steps:')
    console.log('   1. Change the superadmin password after first login')
    console.log('   2. Update the database schema to include role field in registration codes')
    console.log('   3. Test the superadmin functionality')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
if (require.main === module) {
  migrateSuperadmin()
    .then(() => {
      console.log(`[${new Date().toISOString()}] Migration completed.`)
      process.exit(0)
    })
    .catch((error) => {
      console.error(`[${new Date().toISOString()}] Migration failed:`, error)
      process.exit(1)
    })
}

module.exports = { migrateSuperadmin }
