// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// Run with: npx tsx test/installments.test.ts
import assert from 'node:assert/strict'
import {
  addMonthsClamped,
  buildInstallmentSchedule,
  daysBetween,
  formatMoney,
  installmentSmsText,
  normalizeInstallmentPhone,
  reminderKindFor,
  remainingAmount,
  overpaidAmount,
  summarizeContract,
  todayInTbilisi,
  toTetri,
} from '../app/lib/installments'

const sum = (rows) => rows.reduce((total, row) => total + toTetri(row.amount), 0)

// The demo's own example
{
  const rows = buildInstallmentSchedule(10000, 3000, 7, '2026-12-15')
  assert.equal(rows.length, 7)
  assert.ok(rows.every((row) => row.amount === 1000))
  assert.equal(rows[0].due_date, '2026-12-15')
  assert.equal(rows[1].due_date, '2027-01-15')
  assert.equal(rows[6].due_date, '2027-06-15')
}

// Rounding: the remainder lands on the last payment and the total stays exact
{
  const rows = buildInstallmentSchedule(7000, 0, 3, '2026-01-10')
  assert.deepEqual(rows.map((row) => row.amount), [2333.33, 2333.33, 2333.34])
  assert.equal(sum(rows), 700000)
  for (const [total, down, months] of [[1234.56, 0.01, 7], [999.99, 100.5, 11], [50000, 12345.67, 60], [0.6, 0, 3]]) {
    assert.equal(sum(buildInstallmentSchedule(total, down, months, '2026-03-31')), toTetri(total) - toTetri(down))
  }
}

// Short months keep the original payment day afterwards
{
  assert.equal(addMonthsClamped('2026-01-31', 1), '2026-02-28')
  assert.equal(addMonthsClamped('2026-01-31', 2), '2026-03-31')
  assert.equal(addMonthsClamped('2028-01-31', 1), '2028-02-29')
  assert.equal(addMonthsClamped('2026-11-30', 3), '2027-02-28')
  assert.equal(addMonthsClamped('2026-12-15', 1), '2027-01-15')
}

// Invalid input is refused
{
  assert.throws(() => buildInstallmentSchedule(100, 100, 3, '2026-01-01'))
  assert.throws(() => buildInstallmentSchedule(100, 200, 3, '2026-01-01'))
  assert.throws(() => buildInstallmentSchedule(100, 0, 0, '2026-01-01'))
  assert.throws(() => buildInstallmentSchedule(100, 0, 61, '2026-01-01'))
  assert.throws(() => buildInstallmentSchedule(100, 0, 1.5, '2026-01-01'))
  assert.throws(() => buildInstallmentSchedule(0.02, 0, 3, '2026-01-01'))
}

// Reminder windows
{
  const today = '2026-06-15'
  const expected = { '2026-06-19': null, '2026-06-18': 'before_3', '2026-06-16': 'before_3', '2026-06-15': 'due_day', '2026-06-14': null, '2026-06-13': null, '2026-06-12': 'overdue_3', '2026-06-09': 'overdue_3', '2026-06-08': 'overdue_7', '2026-06-01': 'overdue_7', '2026-05-31': null }
  for (const [due, kind] of Object.entries(expected)) assert.equal(reminderKindFor(due, today), kind, due)
  assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1)
}

// "Today" follows Tbilisi, not the server's UTC clock
assert.equal(todayInTbilisi(new Date('2026-06-14T21:00:00Z')), '2026-06-15')
assert.equal(todayInTbilisi(new Date('2026-06-14T19:59:00Z')), '2026-06-14')

// Phone numbers
assert.equal(normalizeInstallmentPhone('599 12 34 56'), '995599123456')
assert.equal(normalizeInstallmentPhone('+995 599 123 456'), '995599123456')
assert.equal(normalizeInstallmentPhone('12345'), '')

// Money
assert.equal(formatMoney(7000), '7 000,00 ₾')
assert.equal(formatMoney(1234567.5), '1 234 567,50 ₾')
assert.equal(formatMoney(0.1 + 0.2), '0,30 ₾')
assert.equal(remainingAmount({ amount: 1000, paid_amount: 400.5 }), 599.5)
assert.equal(remainingAmount({ amount: 1000, paid_amount: 1200 }), 0)
assert.equal(overpaidAmount({ amount: 1000, paid_amount: 1200 }), 200)

// Contract totals
{
  const row = (due_date, amount, paid_amount, status) => ({ id: due_date, installment_number: 1, due_date, amount, paid_amount, status })
  const summary = summarizeContract({ total_price: 10000, down_payment: 3000, status: 'active', installment_schedule: [
    row('2026-01-15', 1000, 1000, 'paid'),
    row('2026-02-15', 1000, 300, 'pending'),
    row('2026-03-15', 5000, 0, 'pending'),
  ] }, '2026-03-01')
  assert.equal(summary.financed, 7000)
  assert.equal(summary.remaining, 5700)
  assert.equal(summary.overdue, 700)
  assert.equal(summary.paidCount, 1)
  assert.equal(summary.nextDue.due_date, '2026-02-15')
}

// SMS stays plain Latin so it is not billed as multiple Georgian segments
{
  const text = installmentSmsText('ML-2026-001', 1000, '2026-12-15', 'before_3', 'https://medicalline.ge/installment/abc')
  assert.ok(text.includes('1000.00 GEL') && text.includes('15.12.2026'))
  assert.ok(/^[\x20-\x7E]+$/.test(text), text)
  assert.ok(installmentSmsText('ML-1', 5, '2026-01-01', 'overdue_7', 'x').includes('vadagadacilebulia'))
}

console.log('installments: all tests passed')
