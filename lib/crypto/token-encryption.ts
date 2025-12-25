import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable not set')
  }
  if (key.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }
  return Buffer.from(key, 'hex')
}

/**
 * Encrypt a token using AES-256-GCM
 * Returns format: iv:authTag:encrypted (all hex-encoded)
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ])

  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypt a token encrypted with encryptToken
 */
export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey()
  const parts = ciphertext.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format')
  }

  const [ivHex, authTagHex, encryptedHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]).toString('utf8')
}
