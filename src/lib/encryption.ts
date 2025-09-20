import crypto from 'crypto'

// Encryption key - in production, this should be stored in environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!'
const KEY = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
const ALGORITHM = 'aes-256-cbc'

/**
 * Encrypts a string using AES-256-CBC
 * @param text - The text to encrypt
 * @returns The encrypted text in format: iv:encryptedData
 */
export function encrypt(text: string): string {
  if (!text) return ''
  
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return `${iv.toString('hex')}:${encrypted}`
}

/**
 * Decrypts a string using AES-256-CBC
 * @param encryptedText - The encrypted text in format: iv:encryptedData
 * @returns The decrypted text
 */
export function decrypt(encryptedText: string): string {
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

/**
 * Encrypts alarm code for database storage
 * @param alarmCode - The 4-digit alarm code
 * @returns Encrypted alarm code
 */
export function encryptAlarmCode(alarmCode: string): string {
  if (!alarmCode || alarmCode.length !== 4) {
    return ''
  }
  return encrypt(alarmCode)
}

/**
 * Decrypts alarm code from database
 * @param encryptedAlarmCode - The encrypted alarm code from database
 * @returns Decrypted 4-digit alarm code
 */
export function decryptAlarmCode(encryptedAlarmCode: string): string {
  if (!encryptedAlarmCode) {
    return ''
  }
  return decrypt(encryptedAlarmCode)
}

/**
 * Validates if a string is a valid 4-digit alarm code
 * @param code - The code to validate
 * @returns True if valid, false otherwise
 */
export function isValidAlarmCode(code: string): boolean {
  return /^\d{4}$/.test(code)
}
