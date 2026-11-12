import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const currency = (request.nextUrl.searchParams.get('currency') || 'USD').toUpperCase()
  const date = request.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10)

  if (!['USD', 'EUR'].includes(currency)) {
    return NextResponse.json({ error: 'Unsupported currency' }, { status: 400 })
  }

  const url = new URL('https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/ka/json/')
  url.searchParams.set('currencies', currency)
  url.searchParams.set('date', date)

  try {
    const response = await fetch(url, { next: { revalidate: 3600 } })
    if (!response.ok) throw new Error(`NBG returned ${response.status}`)
    const rows = await response.json()
    const item = rows?.[0]?.currencies?.find((row: { code?: string }) => row.code === currency)
    const rate = Number(item?.rate || 0) / Number(item?.quantity || 1)

    if (!Number.isFinite(rate) || rate <= 0) {
      return NextResponse.json({ error: 'Rate not found' }, { status: 404 })
    }

    return NextResponse.json({ currency, date: rows?.[0]?.date || date, rate })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'NBG rate lookup failed' },
      { status: 502 },
    )
  }
}
