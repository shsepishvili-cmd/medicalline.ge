import { NextRequest, NextResponse } from 'next/server'

const RS_URL = 'https://www.revenue.mof.ge/ntosservice/ntosservice.asmx'
const RS_NS = 'http://tempuri.org/'

function escXml(s: unknown): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function xmlVal(xml: string, tag: string): string | null {
  const r = new RegExp(`<(?:[\\w]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[\\w]+:)?${tag}>`, 'i')
  const m = xml.match(r)
  return m ? m[1].trim() : null
}

async function soapCall(method: string, paramsXml: string) {
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

  const res = await fetch(RS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: `"${RS_NS}${method}"`,
    },
    body,
  })

  return { status: res.status, body: await res.text() }
}

async function rsLogin(username: string, password: string) {
  const res = await soapCall('chek', `
    <su>${escXml(username)}</su>
    <sp>${escXml(password)}</sp>
    <user_id>0</user_id>`)
  const fault = xmlVal(res.body, 'faultstring')
  if (fault) throw new Error(`Rs.ge: ${fault}`)
  const ok = xmlVal(res.body, 'chekResult')
  const userId = xmlVal(res.body, 'user_id')
  if (!ok || ok === 'false') throw new Error('Rs.ge credentials are invalid')
  return { userId: parseInt(userId || '0', 10) }
}

async function lookupOrgByTin(userId: number, tin: string, username: string, password: string) {
  const res = await soapCall('get_un_id_from_tin', `
    <user_id>${userId}</user_id>
    <tin>${escXml(tin)}</tin>
    <name></name>
    <su>${escXml(username)}</su>
    <sp>${escXml(password)}</sp>`)

  const fault = xmlVal(res.body, 'faultstring')
  if (fault) throw new Error(`Rs.ge: ${fault}`)

  const unId = xmlVal(res.body, 'get_un_id_from_tinResult')
  if (!unId || parseInt(unId, 10) <= 0) throw new Error('კოდი ვერ მოიძებნა Rs.ge-ში')

  return {
    tin,
    name: xmlVal(res.body, 'name') || '',
    address:
      xmlVal(res.body, 'address') ||
      xmlVal(res.body, 'adress') ||
      xmlVal(res.body, 'legal_address') ||
      xmlVal(res.body, 'fact_address') ||
      '',
    owner:
      xmlVal(res.body, 'owner') ||
      xmlVal(res.body, 'director') ||
      xmlVal(res.body, 'director_name') ||
      xmlVal(res.body, 'head_name') ||
      '',
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tin, username: bodyUsername, password: bodyPassword } = await request.json()
    const cleanTin = String(tin || '').replace(/\D/g, '')
    if (!cleanTin) {
      return NextResponse.json({ error: 'საიდენტიფიკაციო კოდი სავალდებულოა' }, { status: 400 })
    }

    const username = String(bodyUsername || process.env.RSGE_USERNAME || '').trim()
    const password = String(bodyPassword || process.env.RSGE_PASSWORD || '').trim()
    if (!username || !password) {
      return NextResponse.json({ error: 'Rs.ge credentials are not configured on the server' }, { status: 400 })
    }

    const { userId } = await rsLogin(username, password)
    const org = await lookupOrgByTin(userId, cleanTin, username, password)
    return NextResponse.json({ ok: true, result: org })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Rs.ge lookup failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
