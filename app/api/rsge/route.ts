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

async function correctTransportMark(
  p_id: number,
  p_seller_un_id: number,
  p_transport_mark: string,
  user_id: number,
  su: string,
  sp: string,
) {
  const res = await soapCall('correct_transport_mark', `
    <p_id>${p_id}</p_id>
    <p_seller_un_id>${p_seller_un_id}</p_seller_un_id>
    <p_transport_mark>${escXml(p_transport_mark)}</p_transport_mark>
    <user_id>${user_id}</user_id>
    <su>${escXml(su)}</su>
    <sp>${escXml(sp)}</sp>`, SPEC_RS_URL)
  const fault = xmlVal(res.body, 'faultstring')
  if (fault) throw new Error(`Rs.ge (transport): ${fault}`)
}

async function correctDriverInfo(
  p_id: number,
  p_seller_un_id: number,
  p_driver_info: string,
  p_driver_no: string,
  p_driver_is_geo: number,
  user_id: number,
  su: string,
  sp: string,
) {
  const res = await soapCall('correct_driver_info', `
    <p_id>${p_id}</p_id>
    <p_seller_un_id>${p_seller_un_id}</p_seller_un_id>
    <p_driver_info>${escXml(p_driver_info)}</p_driver_info>
    <p_driver_no>${escXml(p_driver_no)}</p_driver_no>
    <p_driver_is_geo>${p_driver_is_geo}</p_driver_is_geo>
    <user_id>${user_id}</user_id>
    <su>${escXml(su)}</su>
    <sp>${escXml(sp)}</sp>`, SPEC_RS_URL)
  const fault = xmlVal(res.body, 'faultstring')
  if (fault) throw new Error(`Rs.ge (driver): ${fault}`)
}

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
      if (!invoice)    return NextResponse.json({ error: 'invoice data missing' }, { status: 400 })
      if (!senderTin)  return NextResponse.json({ error: 'გამყიდველის ს/ნ სავალდებულოა' }, { status: 400 })

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

      const driverInfo = String(invoice.driverInfo || '')
      const driverNo = String(invoice.driverNo || '')
      const transportMark = String(invoice.transportMark || '')
      const driverIsGeo = Number(invoice.driverIsGeo ?? 1)

      if (transportMark) {
        await correctTransportMark(invois_id, seller_un_id, transportMark, user_id, username, password)
      }

      if (driverInfo || driverNo) {
        await correctDriverInfo(invois_id, seller_un_id, driverInfo, driverNo, driverIsGeo, user_id, username, password)
      }

      return NextResponse.json({
        ok: true,
        message: 'ინვოისი წარმატებით გაიგზავნა Rs.ge-ზე ✓',
        rsId: invois_id,
      })
    }

    return NextResponse.json({ error: 'უცნობი action' }, { status: 400 })

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
