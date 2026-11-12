// Run with: npx tsx test/expo2026.test.ts
import assert from 'node:assert/strict'
import { hashLinkToken, hashOtp, isWellFormedLinkToken, newLinkToken, newOtpCode, parseRegistration, phoneLoginEmail, sameHash } from '../app/lib/phone-auth'
import { normalizeGeorgianPhone } from '../app/lib/phone-verification'

const SECRET = 'x'.repeat(40)

// Codes are six digits and spread over the whole range
{
  const codes = Array.from({ length: 2000 }, () => newOtpCode())
  assert.ok(codes.every((code) => /^\d{6}$/.test(code)))
  assert.ok(new Set(codes).size > 1900)
}

// A code hash is bound to its number and to the secret
{
  const a = hashOtp('995599000001', '123456', SECRET)
  assert.equal(a, hashOtp('995599000001', '123456', SECRET))
  assert.notEqual(a, hashOtp('995599000002', '123456', SECRET))
  assert.notEqual(a, hashOtp('995599000001', '123457', SECRET))
  assert.notEqual(a, hashOtp('995599000001', '123456', 'y'.repeat(40)))
  assert.ok(sameHash(a, a))
  assert.ok(!sameHash(a, hashOtp('995599000001', '000000', SECRET)))
  assert.ok(!sameHash(a, ''))
  assert.ok(!sameHash('', ''))
}

// Link tokens: 256 bits, URL-safe, only the hash is stored
{
  const tokens = Array.from({ length: 500 }, () => newLinkToken())
  assert.ok(tokens.every(isWellFormedLinkToken))
  assert.equal(new Set(tokens).size, 500)
  assert.match(hashLinkToken(tokens[0]), /^[0-9a-f]{64}$/)
  assert.notEqual(hashLinkToken(tokens[0]), tokens[0])
  assert.ok(!isWellFormedLinkToken('secure'))
  assert.ok(!isWellFormedLinkToken(`${tokens[0]}x`))
  assert.ok(!isWellFormedLinkToken(undefined))
  assert.ok(!isWellFormedLinkToken('a/b'.padEnd(43, 'c')))
}

// Phone numbers: the same rules as normalize_ge_phone() in the migration
{
  const cases: Array<[string, string]> = [
    ['599 12 34 56', '995599123456'], ['+995 599 123 456', '995599123456'], ['995599123456', '995599123456'],
    ['(599) 12-34-56', '995599123456'], ['0599123456', ''], ['12345', ''], ['', ''], ['322123456', ''],
  ]
  for (const [input, expected] of cases) assert.equal(normalizeGeorgianPhone(input), expected, input)
  assert.equal(phoneLoginEmail('995599123456'), '995599123456@phone.medicalline.ge')
}

// Registration input
{
  const valid = { fullName: ' ნინო ბერიძე ', profession: 'სტომატოლოგი', clinicName: 'Smile', city: 'თბილისი', privacyAccepted: true, marketingConsent: false }
  assert.deepEqual(parseRegistration(valid), { ...valid, fullName: 'ნინო ბერიძე' })
  assert.equal(parseRegistration({ ...valid, privacyAccepted: false }), null, 'privacy consent is required')
  assert.equal(parseRegistration({ ...valid, privacyAccepted: 'true' }), null, 'consent must be an explicit true')
  assert.equal(parseRegistration({ ...valid, fullName: 'a' }), null)
  assert.equal(parseRegistration({ ...valid, profession: 'hacker' }), null)
  assert.equal(parseRegistration({ ...valid, marketingConsent: 'yes' })?.marketingConsent, false, 'marketing consent only on explicit true')
  assert.equal(parseRegistration({ ...valid, fullName: 'x'.repeat(500) })?.fullName.length, 120)
  assert.equal(parseRegistration(null), null)
}

console.log('expo2026: all tests passed')
