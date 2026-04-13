import { NextRequest, NextResponse } from 'next/server'

const RS_URL = 'https://www.revenue.mof.ge/ntosservice/ntosservice.asmx'
const SPEC_RS_URL = 'https://webserv.rs.ge/specinvoices/SpecInvoicesService.asmx'
const RS_NS  = 'http://tempuri.org/'

function escXml(s: unknown): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function xmlVal(xml: string, tag: string): string | null {
  const r = new RegExp(`<(?:[\\w]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[\\w]+:)?${tag}>`, 'i')
  const m = xml.match(r)
  return m ? m[1].trim() : null
}

async function soapCall(method: string, paramsXml: string, serviceUrl = RS_URL) {
  const body = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${method} xmlns="${RS_NS}">
      ${paramsXml}
    </${method}>
  </soap:Body>
</soap:Envelope>`

  const res = await fetch(serviceUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': `"${RS_NS}${method}"`,
    },
    body,
  })
  return { status: res.status, body: await res.text() }
}

async function rsLogin(su: string, sp: string) {
  const res = await soapCall('chek', `
    <su>${escXml(su)}</su>
    <sp>${escXml(sp)}</sp>
    <user_id>0</user_id>`)
  const fault = xmlVal(res.body, 'faultstring')
  if (fault) throw new Error(`Rs.ge: ${fault}`)
  const ok      = xmlVal(res.body, 'chekResult')
  const user_id = xmlVal(res.body, 'user_id')
  if (!ok || ok === 'false') throw new Error('Rs.ge: username ან password არასწორია')
  return { user_id: parseInt(user_id || '0') }
}

async function getUnId(user_id: number, tin: string, su: string, sp: string): Promise<number> {
  const res = await soapCall('get_un_id_from_tin', `
    <user_id>${user_id}</user_id>
    <tin>${escXml(tin)}</tin>
    <name></name>
    <su>${escXml(su)}</su>
    <sp>${escXml(sp)}</sp>`)
  const fault = xmlVal(res.body, 'faultstring')
  if (fault) throw new Error(`Rs.ge (un_id): ${fault}`)
  const un_id = xmlVal(res.body, 'get_un_id_from_tinResult')
  if (!un_id || parseInt(un_id) <= 0)
    throw new Error(`Rs.ge: სუბიექტი "${tin}" ვერ მოიძებნა`)
  return parseInt(un_id)
}

async function lookupOrgByTin(user_id: number, tin: string, su: string, sp: string) {
  const res = await soapCall('get_un_id_from_tin', `
    <user_id>${user_id}</user_id>
    <tin>${escXml(tin)}</tin>
    <name></name>
    <su>${escXml(su)}</su>
    <sp>${escXml(sp)}</sp>`)
  const fault = xmlVal(res.body, 'faultstring')
  if (fault) throw new Error(`Rs.ge (search): ${fault}`)
  const un_id = xmlVal(res.body, 'get_un_id_from_tinResult')
  const name = xmlVal(res.body, 'name')
  if (!un_id || parseInt(un_id) <= 0) {
    throw new Error(`Rs.ge: სუბიექტი "${tin}" ვერ მოიძებნა`)
  }
  return { un_id: parseInt(un_id), tin, name: name || tin }
}

// =========== ანგარიშ-ფაქტურა (ntosservice) ===========

async function saveInvoiceHeader(
  user_id: number, seller_un_id: number, buyer_un_id: number,
  inv: Record<string, unknown>, su: string, sp: string
): Promise<number> {
  const opDate = (String(inv.date || '').split('T')[0] || new Date().toISOString().split('T')[0]) + 'T00:00:00'
  const res = await soapCall('save_invoice', `
    <user_id>${user_id}</user_id>
    <invois_id>0</invois_id>
    <operation_date>${opDate}</operation_date>
    <seller_un_id>${seller_un_id}</seller_un_id>
    <buyer_un_id>${buyer_un_id}</buyer_un_id>
    <overhead_no>${escXml(inv.number)}</overhead_no>
    <overhead_dt>${opDate}</overhead_dt>
    <b_s_user_id>0</b_s_user_id>
    <su>${escXml(su)}</su>
    <sp>${escXml(sp)}</sp>`)
  const fault = xmlVal(res.body, 'faultstring')
  if (fault) throw new Error(`Rs.ge (save_invoice): ${fault}`)
  const ok        = xmlVal(res.body, 'save_invoiceResult')
  const invois_id = xmlVal(res.body, 'invois_id')
  if (!ok || ok === 'false') throw new Error('Rs.ge: ინვოისის სათაური ვერ შეინახა')
  return parseInt(invois_id || '0')
}

async function saveInvoiceDesc(
  user_id: number, invois_id: number,
  item: Record<string, unknown>, vatRate: number,
  su: string, sp: string
) {
  const qty     = parseFloat(String(item.qty))   || 1
  const price   = parseFloat(String(item.price)) || 0
  const fullAmt = qty * price
  const drgAmt  = fullAmt * vatRate / (100 + vatRate)
  const res = await soapCall('save_invoice_desc', `
    <user_id>${user_id}</user_id>
    <id>0</id>
    <su>${escXml(su)}</su>
    <sp>${escXml(sp)}</sp>
    <invois_id>${invois_id}</invois_id>
    <goods>${escXml(item.name)}</goods>
    <g_unit>${escXml(item.unit || 'ც.')}</g_unit>
    <g_number>${qty.toFixed(3)}</g_number>
    <full_amount>${fullAmt.toFixed(2)}</full_amount>
    <drg_amount>${drgAmt.toFixed(2)}</drg_amount>
    <aqcizi_amount>0</aqcizi_amount>
    <akciz_id>0</akciz_id>`)
  const fault = xmlVal(res.body, 'faultstring')
  if (fault) throw new Error(`Rs.ge (desc "${item.name}"): ${fault}`)
  const ok = xmlVal(res.body, 'save_invoice_descResult')
  if (!ok || ok === 'false') throw new Error(`Rs.ge: პროდუქტი "${item.name}" ვერ შეინახა`)
}

async function sendInvoice(user_id: number, invois_id: number, su: string, sp: string) {
  const res = await soapCall('change_invoice_status', `
    <user_id>${user_id}</user_id>
    <invois_id>${invois_id}</invois_id>
    <status>1</status>
    <su>${escXml(su)}</su>
    <sp>${escXml(sp)}</sp>`)
  const fault = xmlVal(res.body, 'faultstring')
  if (fault) throw new Error(`Rs.ge (send): ${fault}`)
}

// =========== ზედნადები (SpecInvoicesService) ===========

async function saveWaybillHeader(
  user_id: number, seller_un_id: number, buyer_un_id: number,
  inv: Record<string, unknown>, meta: Record<string, unknown>,
  su: string, sp: string,
  invoiceType: number
): Promise<number> {
  const opDate  = (String(inv.date || '').split('T')[0] || new Date().toISOString().split('T')[0]) + 'T00:00:00'
  const docDate = meta.docDate
    ? `${meta.docDate}T${String(meta.docTime || '00:00:00')}`
    : opDate

  const res = await soapCall('save_invoice_b_n', `
    <invois_id>0</invois_id>
    <p_OPERATION_DT>${opDate}</p_OPERATION_DT>
    <p_SELLER_UN_ID>${seller_un_id}</p_SELLER_UN_ID>
    <p_BUYER_UN_ID>${buyer_un_id}</p_BUYER_UN_ID>
    <p_SSD_N>${escXml(inv.number)}</p_SSD_N>
    <p_SSAF_N></p_SSAF_N>
    <p_CALC_DATE xsi:nil="true"/>
    <p_K_SSAF_N></p_K_SSAF_N>
    <p_TR_ST_DATE>${docDate}</p_TR_ST_DATE>
    <p_OIL_ST_ADDRESS>${escXml(meta.senderAddress)}</p_OIL_ST_ADDRESS>
    <p_OIL_ST_N></p_OIL_ST_N>
    <p_OIL_FN_ADDRESS>${escXml(meta.recipientAddress)}</p_OIL_FN_ADDRESS>
    <p_OIL_FN_N></p_OIL_FN_N>
    <p_TRANSPORT_TYPE>${escXml(meta.transportType || 'საავტომობილო')}</p_TRANSPORT_TYPE>
    <p_TRANSPORT_MARK>${escXml(inv.transportMark)}</p_TRANSPORT_MARK>
    <p_DRIVER_INFO>${escXml(inv.driverInfo)}</p_DRIVER_INFO>
    <p_CARRIER_INFO></p_CARRIER_INFO>
    <p_CARRIE_S_NO></p_CARRIE_S_NO>
    <p_USER_ID>${user_id}</p_USER_ID>
    <p_S_USER_ID>0</p_S_USER_ID>
    <p_B_S_USER_ID>0</p_B_S_USER_ID>
    <p_SSD_DATE>${docDate}</p_SSD_DATE>
    <p_SSAF_DATE xsi:nil="true"/>
    <p_PAY_TYPE>0</p_PAY_TYPE>
    <p_SELLER_PHONE></p_SELLER_PHONE>
    <p_BUYER_PHONE></p_BUYER_PHONE>
    <p_driver_no>${escXml(inv.driverNo)}</p_driver_no>
    <p_SSAF_ALT_NUMBER></p_SSAF_ALT_NUMBER>
    <p_SSAF_ALT_TYPE></p_SSAF_ALT_TYPE>
    <p_SSD_ALT_NUMBER></p_SSD_ALT_NUMBER>
    <p_SSD_ALT_TYPE></p_SSD_ALT_TYPE>
    <p_SSAF_ALT_STATUS>0</p_SSAF_ALT_STATUS>
    <p_SSD_ALT_STATUS>0</p_SSD_ALT_STATUS>
    <p_driver_is_geo>${Number(inv.driverIsGeo ?? 1)}</p_driver_is_geo>
    <user_id>${user_id}</user_id>
    <invoiceType>${invoiceType}</invoiceType>
    <su>${escXml(su)}</su>
    <sp>${escXml(sp)}</sp>`, SPEC_RS_URL)

  const fault = xmlVal(res.body, 'faultstring')
  if (fault) throw new Error(`Rs.ge (save_invoice_b_n): ${fault}`)
  const ok        = xmlVal(res.body, 'save_invoice_b_nResult')
  const invois_id = xmlVal(res.body, 'invois_id')
  if (!ok || ok === 'false') throw new Error('Rs.ge: ზედნადების სათაური ვერ შეინახა')
  return parseInt(invois_id || '0')
}

async function saveWaybillDesc(
  user_id: number, invois_id: number,
  item: Record<string, unknown>, vatRate: number,
  su: string, sp: string
) {
  const qty    = parseFloat(String(item.qty))   || 1
  const price  = parseFloat(String(item.price)) || 0
  const drgAmt = qty * price * vatRate / (100 + vatRate)

  const res = await soapCall('save_invoice_desc_n', `
    <user_id>${user_id}</user_id>
    <id>0</id>
    <su>${escXml(su)}</su>
    <sp>${escXml(sp)}</sp>
    <p_inv_id>${invois_id}</p_inv_id>
    <p_goods>${escXml(item.name)}</p_goods>
    <p_g_unit>${escXml(item.unit || 'ც.')}</p_g_unit>
    <p_g_number>${qty.toFixed(3)}</p_g_number>
    <p_un_price>${price.toFixed(2)}</p_un_price>
    <p_drg_amount>${drgAmt.toFixed(2)}</p_drg_amount>
    <p_aqcizi_amount>0</p_aqcizi_amount>
    <p_user_id>${user_id}</p_user_id>
    <p_aqcizi_id>0</p_aqcizi_id>
    <p_aqcizi_rate>0</p_aqcizi_rate>
    <p_dgg_rate>${vatRate}</p_dgg_rate>
    <p_g_number_alt>0</p_g_number_alt>
    <p_good_id>0</p_good_id>
    <p_drg_type>0</p_drg_type>`, SPEC_RS_URL)

  const fault = xmlVal(res.body, 'faultstring')
  if (fault) throw new Error(`Rs.ge (desc_n "${item.name}"): ${fault}`)
  const ok = xmlVal(res.body, 'save_invoice_desc_nResult')
  if (!ok || ok === 'false') throw new Error(`Rs.ge: პროდუქტი "${item.name}" ვერ შეინახა ზედნადებში`)
}

async function sendWaybill(user_id: number, invois_id: number, su: string, sp: string) {
  const res = await soapCall('change_invoice_status_n', `
    <user_id>${user_id}</user_id>
    <inv_id>${invois_id}</inv_id>
    <status>1</status>
    <su>${escXml(su)}</su>
    <sp>${escXml(sp)}</sp>`, SPEC_RS_URL)
  const fault = xmlVal(res.body, 'faultstring')
  if (fault) throw new Error(`Rs.ge (send_waybill): ${fault}`)
}

// =========== POST handler ===========

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, username, password, senderTin, invoice, query } = body

    if (!username || !password)
      return NextResponse.json({ error: 'username და password სავალდებულოა' }, { status: 400 })

    const { user_id } = await rsLogin(username, password)

    if (action === 'test') {
      return NextResponse.json({
        ok: true,
        message: `კავშირი წარმატებულია ✓ (user_id: ${user_id})`,
        user_id,
      })
    }

    if (action === 'search_org') {
      const tin = String(query || '').replace(/\D/g, '')
      if (!tin) return NextResponse.json({ error: 'საიდენტიფიკაციო კოდი სავალდებულოა' }, { status: 400 })
      const org = await lookupOrgByTin(user_id, tin, username, password)
      return NextResponse.json({
        ok: true,
        results: [{ id: org.tin, name: org.name, unId: org.un_id }],
      })
    }

    if (action === 'upload_invoice') {
      if (!invoice)   return NextResponse.json({ error: 'invoice data missing' }, { status: 400 })
      if (!senderTin) return NextResponse.json({ error: 'გამყიდველის ს/ნ სავალდებულოა' }, { status: 400 })

      const seller_un_id = await getUnId(user_id, senderTin, username, password)

      let buyer_un_id = 0
      if (invoice.clientIdNum) {
        try { buyer_un_id = await getUnId(user_id, invoice.clientIdNum, username, password) }
        catch { /* buyer TIN not found — continue with 0 */ }
      }

      const invois_id = await saveInvoiceHeader(user_id, seller_un_id, buyer_un_id, invoice, username, password)

      const vatRate = parseFloat(String(invoice.vatRate)) || 18
      const items   = (Array.isArray(invoice.items) ? invoice.items : [])
        .filter((i: Record<string, unknown>) => i.name && parseFloat(String(i.price)) > 0)

      if (!items.length)
        return NextResponse.json({ error: 'ინვოისს პროდუქტები არ აქვს' }, { status: 400 })

      for (const item of items)
        await saveInvoiceDesc(user_id, invois_id, item, vatRate, username, password)

      await sendInvoice(user_id, invois_id, username, password)

      return NextResponse.json({
        ok: true,
        message: 'ანგარიშ-ფაქტურა წარმატებით გაიგზავნა Rs.ge-ზე ✓',
        rsId: invois_id,
      })
    }

    if (action === 'upload_waybill') {
      if (!invoice)   return NextResponse.json({ error: 'invoice data missing' }, { status: 400 })
      if (!senderTin) return NextResponse.json({ error: 'გამყიდველის ს/ნ სავალდებულოა' }, { status: 400 })

      const seller_un_id = await getUnId(user_id, senderTin, username, password)

      let buyer_un_id = 0
      if (invoice.clientIdNum) {
        try { buyer_un_id = await getUnId(user_id, invoice.clientIdNum, username, password) }
        catch { /* buyer TIN not found */ }
      }

      const meta = (invoice.waybillMeta as Record<string, unknown>) || {}
      // invoiceType 1 = სასაქონლო ზედნადები
      const invois_id = await saveWaybillHeader(user_id, seller_un_id, buyer_un_id, invoice, meta, username, password, 1)

      const vatRate = parseFloat(String(invoice.vatRate)) || 18
      const items   = (Array.isArray(invoice.items) ? invoice.items : [])
        .filter((i: Record<string, unknown>) => i.name && parseFloat(String(i.price)) > 0)

      if (!items.length)
        return NextResponse.json({ error: 'ინვოისს პროდუქტები არ აქვს' }, { status: 400 })

      for (const item of items)
        await saveWaybillDesc(user_id, invois_id, item, vatRate, username, password)

      await sendWaybill(user_id, invois_id, username, password)

      return NextResponse.json({
        ok: true,
        message: 'ზედნადები წარმატებით გაიგზავნა Rs.ge-ზე ✓',
        rsId: invois_id,
      })
    }

    return NextResponse.json({ error: 'უცნობი action' }, { status: 400 })

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
