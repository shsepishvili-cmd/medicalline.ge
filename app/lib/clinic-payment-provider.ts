import { createVerify } from 'node:crypto'

export type PaymentSessionInput = {
  transactionId: string
  amount: number
  currency: string
  description: string
  successUrl: string
  cancelUrl: string
  webhookUrl: string
  customer: { name: string; email?: string; phone?: string }
  // Return to successUrl/cancelUrl instead of the configured clinic result page.
  useProvidedRedirects?: boolean
}

export type PaymentSessionResult = { providerOrderId: string; redirectUrl: string; raw: unknown }

const BOG_AUTH_URL = 'https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token'
const BOG_ORDER_URL = 'https://api.bog.ge/payments/v1/ecommerce/orders'
const BOG_CALLBACK_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu4RUyAw3+CdkS3ZNILQh
zHI9Hemo+vKB9U2BSabppkKjzjjkf+0Sm76hSMiu/HFtYhqWOESryoCDJoqffY0Q
1VNt25aTxbj068QNUtnXQ7KQVLA+pG0smf+EBWlS1vBEAFbIas9d8c9b9sSEkTrr
TYQ90WIM8bGB6S/KLVoT1a7SnzabjoLc5Qf/SLDG5fu8dH8zckyeYKdRKSBJKvhx
tcBuHV4f7qsynQT+f2UYbESX/TLHwT5qFWZDHZ0YUOUIvb8n7JujVSGZO9/+ll/g
4ZIWhC1MlJgPObDwRkRd8NFOopgxMcMsDIZIoLbWKhHVq67hdbwpAq9K9WMmEhPn
PwIDAQAB
-----END PUBLIC KEY-----`

export function isBogPaymentsEnabled() {
  return process.env.BOG_PAYMENTS_ENABLED?.trim().toLowerCase() === 'true'
}

export function isBogTestMode() {
  return process.env.VERCEL_ENV !== 'production' && process.env.BOG_TEST_MODE?.trim().toLowerCase() === 'true'
}

export function getPaymentAvailability() {
  const clientId = process.env.OPAY_CLIENT_ID?.trim() || process.env.PAYMENT_MERCHANT_ID?.trim() || ''
  const clientSecret = process.env.OPAY_SECRET_KEY?.trim() || process.env.PAYMENT_SECRET_KEY?.trim() || ''
  const provider = process.env.PAYMENT_PROVIDER?.trim() || (clientId && clientSecret ? 'bog' : '')
  const apiUrl = process.env.PAYMENT_API_URL?.trim() || BOG_ORDER_URL
  const authUrl = process.env.BOG_AUTH_URL?.trim() || BOG_AUTH_URL
  const featureEnabled = provider.toLowerCase() !== 'bog' || isBogPaymentsEnabled()
  const useConfiguredRedirects = process.env.VERCEL_ENV === 'production'
  return {
    provider, apiUrl, authUrl, clientId, clientSecret, featureEnabled,
    callbackUrl: useConfiguredRedirects ? process.env.BOG_CALLBACK_URL?.trim() || '' : '',
    successUrl: useConfiguredRedirects ? process.env.BOG_SUCCESS_URL?.trim() || '' : '',
    failUrl: useConfiguredRedirects ? process.env.BOG_FAIL_URL?.trim() || '' : '',
    configured: Boolean(featureEnabled && provider && apiUrl && clientId && clientSecret),
  }
}

async function getBogAccessToken(authUrl: string, clientId: string, clientSecret: string) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await fetch(authUrl, {
    method: 'POST',
    headers: { authorization: `Basic ${credentials}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok || typeof payload.access_token !== 'string') throw new Error('BOG authentication failed.')
  return payload.access_token
}

function maskEmail(value?: string) {
  if (!value || !value.includes('@')) return undefined
  const [name, domain] = value.split('@')
  return `${name.slice(0, 1)}***@${domain}`
}

function maskPhone(value?: string) {
  if (!value) return undefined
  const normalized = value.replace(/\s+/g, '')
  return normalized.length > 4 ? `${normalized.slice(0, 4)}***${normalized.slice(-2)}` : undefined
}

function paymentResultUrl(configuredUrl: string, fallbackUrl: string, transactionId: string, cancelled = false) {
  const url = new URL(configuredUrl || fallbackUrl)
  if (!url.searchParams.has('transaction')) url.searchParams.set('transaction', transactionId)
  if (cancelled) url.searchParams.set('cancelled', '1')
  return url.toString()
}

export async function createProviderPaymentSession(input: PaymentSessionInput): Promise<PaymentSessionResult> {
  const config = getPaymentAvailability()
  if (!config.configured) throw new Error('PAYMENT_NOT_CONFIGURED')
  if (config.provider.toLowerCase() === 'bog') {
    const accessToken = await getBogAccessToken(config.authUrl, config.clientId, config.clientSecret)
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        'accept-language': 'ka',
        'idempotency-key': input.transactionId,
      },
      body: JSON.stringify({
        application_type: 'web',
        callback_url: config.callbackUrl || input.webhookUrl,
        external_order_id: input.transactionId,
        capture: 'automatic',
        buyer: { full_name: input.customer.name, masked_email: maskEmail(input.customer.email), masked_phone: maskPhone(input.customer.phone) },
        purchase_units: {
          currency: input.currency,
          total_amount: input.amount,
          basket: [{ product_id: input.transactionId, description: input.description, quantity: 1, unit_price: input.amount }],
        },
        redirect_urls: {
          success: input.useProvidedRedirects ? input.successUrl : paymentResultUrl(config.successUrl, input.successUrl, input.transactionId),
          fail: input.useProvidedRedirects ? input.cancelUrl : paymentResultUrl(config.failUrl, input.cancelUrl, input.transactionId, true),
        },
        ttl: 15,
      }),
      cache: 'no-store',
    })
    const raw = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok) throw new Error(typeof raw.message === 'string' ? raw.message : 'BOG rejected the order request.')
    const links = raw._links as { redirect?: { href?: string } } | undefined
    const providerOrderId = typeof raw.id === 'string' ? raw.id : ''
    const redirectUrl = links?.redirect?.href || ''
    if (!providerOrderId || !redirectUrl) throw new Error('BOG returned an incomplete order response.')
    return { providerOrderId, redirectUrl, raw }
  }

  throw new Error('Unsupported payment provider.')
}

export function verifyPaymentWebhook(rawBody: string, signature: string) {
  if (!signature) return false
  const publicKey = process.env.BOG_CALLBACK_PUBLIC_KEY?.replace(/\\n/g, '\n').trim() || BOG_CALLBACK_PUBLIC_KEY
  try {
    const verifier = createVerify('RSA-SHA256')
    verifier.update(rawBody)
    verifier.end()
    return verifier.verify(publicKey, signature.trim(), 'base64')
  } catch {
    return false
  }
}
