import { describe, it, expect, beforeAll } from '@jest/globals'
import { encryptToken, decryptToken } from '../token-encryption'

describe('Token Encryption', () => {
  beforeAll(() => {
    // Set test encryption key
    process.env.TOKEN_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  })

  it('should encrypt and decrypt tokens correctly', () => {
    const plaintext = 'ya29.a0AfH6SMBx...'
    const encrypted = encryptToken(plaintext)
    const decrypted = decryptToken(encrypted)

    expect(decrypted).toBe(plaintext)
    expect(encrypted).not.toBe(plaintext)
  })

  it('should produce different ciphertext for same plaintext', () => {
    const plaintext = 'same-token'
    const encrypted1 = encryptToken(plaintext)
    const encrypted2 = encryptToken(plaintext)

    expect(encrypted1).not.toBe(encrypted2)
  })

  it('should throw error if encryption key missing', () => {
    const originalKey = process.env.TOKEN_ENCRYPTION_KEY
    delete process.env.TOKEN_ENCRYPTION_KEY

    expect(() => encryptToken('test')).toThrow()

    process.env.TOKEN_ENCRYPTION_KEY = originalKey
  })
})
