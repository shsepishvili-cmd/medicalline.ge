import type { OrderPortalFormValues } from './order-portal-types'
import { normalizeGeorgianPhone } from './phone-verification'

export function cleanOrderText(value: unknown, max = 300) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max)
}

export function cleanOrderLongText(value: unknown, max = 1600) {
  return String(value || '').trim().slice(0, max)
}

export function normalizeOrderPhone(value: unknown) {
  return normalizeGeorgianPhone(String(value || ''))
}

export function createEmptyOrderForm(): OrderPortalFormValues {
  return {
    fullName: '',
    clinicName: '',
    phone: '',
    city: '',
    email: '',
    taxId: '',
    requestedProduct: '',
    productCategory: '',
    quantity: '1',
    urgency: 'this_week',
    preferredContact: 'phone',
    deliveryCity: '',
    deliveryAddress: '',
    comment: '',
  }
}

export function validateOrderPayload(input: Partial<OrderPortalFormValues>) {
  const fullName = cleanOrderText(input.fullName, 160)
  const clinicName = cleanOrderText(input.clinicName, 180)
  const phone = normalizeOrderPhone(input.phone)
  const city = cleanOrderText(input.city, 120)
  const email = cleanOrderText(input.email, 180).toLowerCase()
  const taxId = cleanOrderText(input.taxId, 80)
  const requestedProduct = cleanOrderLongText(input.requestedProduct, 1400)
  const productCategory = cleanOrderText(input.productCategory, 120)
  const quantity = Math.max(1, Math.min(99, Number(input.quantity) || 1))
  const urgency = cleanOrderText(input.urgency, 80)
  const preferredContact = cleanOrderText(input.preferredContact, 80)
  const deliveryCity = cleanOrderText(input.deliveryCity || city, 120)
  const deliveryAddress = cleanOrderText(input.deliveryAddress, 300)
  const comment = cleanOrderLongText(input.comment, 1600)

  if (!fullName) throw new Error('მიუთითეთ სახელი და გვარი.')
  if (!phone) throw new Error('მიუთითეთ სწორი ქართული ტელეფონის ნომერი.')
  if (!requestedProduct) throw new Error('მიუთითეთ რა პროდუქტი/აპარატი გჭირდებათ.')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('მიუთითეთ სწორი ელფოსტა.')

  return {
    fullName,
    clinicName,
    phone,
    phoneDisplay: cleanOrderText(input.phone, 80),
    city,
    email,
    taxId,
    requestedProduct,
    productCategory,
    quantity,
    urgency,
    preferredContact,
    deliveryCity,
    deliveryAddress,
    comment,
  }
}
