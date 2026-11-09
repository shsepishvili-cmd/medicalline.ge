import { NextRequest, NextResponse } from 'next/server'
import { requireWarrantySession } from '@/app/lib/supabase-server'
import { isSmsProviderConfigured, sendContractSms } from '@/app/lib/sms-provider'
import { ORDER_STATUSES, type OrderStatus } from '@/app/lib/order-portal-types'
import { calculateWarrantyEnd, warrantySmsText } from '@/app/lib/warranty'
import { getAppBaseUrl } from '@/app/lib/warranty-server'

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  return h.startsWith('Bearer ') ? h.slice(7) : ''
}

function statusSmsText(status: OrderStatus, orderNumber: string) {
  if (status === 'delivered') {
    return `Tqveni shekveta ${orderNumber} gagzavnilia. Madloba, Medical Line Georgia`
  }
  if (status === 'cancelled') {
    return `Tqveni shekveta ${orderNumber} gauqmda. detalebistvis dagvikavshirdit. Medical Line Georgia`
  }
  return ''
}

function cleanText(value: unknown, maxLength = 250) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function isDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = getBearerToken(req)
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    const body = await req.json().catch(() => ({}))
    const updates: Record<string, unknown> = {}
    const createWarranty = body?.createWarranty === true

    if (typeof body?.status === 'string') {
      if (!ORDER_STATUSES.includes(body.status as OrderStatus)) {
        return NextResponse.json({ error: 'Invalid order status.' }, { status: 400 })
      }
      updates.status = body.status
    }

    if (body?.adminNote !== undefined) {
      updates.admin_note = String(body.adminNote || '').trim() || null
    }

    if (body?.reminderAt !== undefined) {
      const reminderValue = String(body.reminderAt || '').trim()
      updates.reminder_at = reminderValue ? new Date(reminderValue).toISOString() : null
    }

    if (!Object.keys(updates).length && !createWarranty) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
    }

    const { tokenClient, profile } = await requireWarrantySession(accessToken)
    const { data: current, error: loadErr } = await tokenClient
      .from('order_portal_orders')
      .select('*, customer:order_customers(*)')
      .eq('id', id)
      .single()

    if (loadErr || !current) {
      return NextResponse.json({ error: loadErr?.message || 'Order not found.' }, { status: 404 })
    }

    const previousStatus = current.status as OrderStatus
    const nextStatus = (updates.status as OrderStatus | undefined) || previousStatus

    let saved = current
    if (Object.keys(updates).length) {
      const { data: updatedOrder, error: updateErr } = await tokenClient
        .from('order_portal_orders')
        .update(updates)
        .eq('id', id)
        .select('*, customer:order_customers(*)')
        .single()

      if (updateErr || !updatedOrder) {
        return NextResponse.json({ error: updateErr?.message || 'Order could not be updated.' }, { status: 500 })
      }
      saved = updatedOrder
    }

    let smsSent = false
    let smsError: string | null = null
    const shouldSendSms = previousStatus !== nextStatus && (nextStatus === 'delivered' || nextStatus === 'cancelled')

    if (shouldSendSms) {
      try {
        if (!isSmsProviderConfigured()) throw new Error('SMS provider is not configured.')
        await sendContractSms(saved.customer?.phone_normalized || saved.customer?.phone_display, statusSmsText(nextStatus, saved.order_number))
        smsSent = true
      } catch (cause) {
        smsError = cause instanceof Error ? cause.message : 'SMS failed.'
      }

      await tokenClient
        .from('order_portal_orders')
        .update({
          status_sms_sent_at: smsSent ? new Date().toISOString() : null,
          status_sms_error: smsError,
        })
        .eq('id', id)
        .then(() => null, () => null)
    }

    let warrantyCreated = false
    let warrantyAlreadyExists = false
    let warrantySmsSent = false
    let warrantySmsError: string | null = null
    let warrantyDocumentUrl: string | null = null
    let warranty: { id: string; warranty_number: string; verify_token: string } | null = null

    if (createWarranty) {
      const warrantyInput = (body?.warranty && typeof body.warranty === 'object' ? body.warranty : {}) as Record<string, unknown>
      const brand = cleanText(warrantyInput.brand, 120)
      const model = cleanText(warrantyInput.model, 120)
      const serialNumber = cleanText(warrantyInput.serialNumber, 160)
      const warrantyStart = cleanText(warrantyInput.warrantyStart, 10)
      const warrantyMonths = Number(warrantyInput.warrantyMonths)

      if (!brand || !serialNumber || !isDateOnly(warrantyStart) || !Number.isInteger(warrantyMonths) || warrantyMonths < 1 || warrantyMonths > 120) {
        return NextResponse.json({
          error: 'Warranty requires brand, serial number, a valid start date, and a duration from 1 to 120 months.',
        }, { status: 400 })
      }

      if (saved.warranty_id) {
        const { data: existingById } = await tokenClient
          .from('warranties')
          .select('id, warranty_number, verify_token')
          .eq('id', saved.warranty_id)
          .maybeSingle()
        warranty = existingById
        warrantyAlreadyExists = Boolean(existingById)
      }

      if (!warranty) {
        const { data: existingByOrder } = await tokenClient
          .from('warranties')
          .select('id, warranty_number, verify_token')
          .eq('order_portal_order_id', id)
          .maybeSingle()
        warranty = existingByOrder
        warrantyAlreadyExists = Boolean(existingByOrder)
      }

      if (!warranty) {
        const warrantyEnd = calculateWarrantyEnd(warrantyStart, warrantyMonths) || warrantyStart
        const { data: insertedWarranty, error: warrantyError } = await tokenClient
          .from('warranties')
          .insert({
            warranty_number: '',
            product_id: null,
            brand,
            product_category: saved.product_category || null,
            product_name: cleanText(saved.requested_product, 500),
            model: model || null,
            serial_number: serialNumber,
            clinic_name: saved.customer?.clinic_name || null,
            customer_name: saved.customer?.full_name || null,
            customer_id_number: saved.customer?.tax_id || null,
            customer_address: saved.delivery_address || saved.customer?.city || null,
            phone: saved.customer?.phone_display || saved.customer?.phone_normalized || null,
            email: saved.customer?.email || null,
            purchase_date: warrantyStart,
            installation_date: null,
            warranty_start: warrantyStart,
            warranty_months: warrantyMonths,
            warranty_end: warrantyEnd,
            invoice_number: saved.order_number,
            sold_by: profile.full_name,
            status: 'active',
            notes: `ავტომატურად შექმნილია შეკვეთიდან ${saved.order_number}`,
            created_by: profile.id,
            erp_party_id: saved.customer?.erp_party_id || null,
            order_portal_order_id: id,
          })
          .select('id, warranty_number, verify_token')
          .single()

        if (warrantyError || !insertedWarranty) {
          const serialConflict = warrantyError?.code === '23505' && String(warrantyError.message || '').includes('serial')
          return NextResponse.json({
            error: serialConflict ? 'This serial number already has a warranty.' : warrantyError?.message || 'Warranty could not be created.',
          }, { status: serialConflict ? 409 : 500 })
        }

        warranty = insertedWarranty
        warrantyCreated = true
      }

      if (!warranty) {
        return NextResponse.json({ error: 'Warranty could not be loaded after creation.' }, { status: 500 })
      }

      const baseUrl = getAppBaseUrl(req.headers.get('origin') || new URL(req.url).origin)
      warrantyDocumentUrl = `${baseUrl}/warranty/verify/${warranty.verify_token}`

      await tokenClient
        .from('warranties')
        .update({ qr_url: warrantyDocumentUrl })
        .eq('id', warranty.id)

      const shouldSendWarrantySms = !saved.warranty_sms_sent_at
      if (shouldSendWarrantySms) {
        try {
          if (!isSmsProviderConfigured()) throw new Error('SMS provider is not configured.')
          await sendContractSms(
            saved.customer?.phone_normalized || saved.customer?.phone_display,
            warrantySmsText(warranty.warranty_number, warrantyDocumentUrl),
          )
          warrantySmsSent = true
        } catch (cause) {
          warrantySmsError = cause instanceof Error ? cause.message : 'Warranty SMS failed.'
        }
      }

      const warrantyOrderPatch = {
        warranty_id: warranty.id,
        warranty_sms_sent_at: warrantySmsSent ? new Date().toISOString() : saved.warranty_sms_sent_at || null,
        warranty_sms_error: warrantySmsError,
      }
      const { data: orderWithWarranty, error: warrantyLinkError } = await tokenClient
        .from('order_portal_orders')
        .update(warrantyOrderPatch)
        .eq('id', id)
        .select('*, customer:order_customers(*)')
        .single()

      if (warrantyLinkError || !orderWithWarranty) {
        return NextResponse.json({ error: warrantyLinkError?.message || 'Warranty was created but could not be linked to the order.' }, { status: 500 })
      }
      saved = orderWithWarranty
    }

    return NextResponse.json({
      ok: true,
      order: saved,
      smsSent,
      smsError,
      warranty,
      warrantyCreated,
      warrantyAlreadyExists,
      warrantySmsSent,
      warrantySmsError,
      warrantyDocumentUrl,
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Order update failed.'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
