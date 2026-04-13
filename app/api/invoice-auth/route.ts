import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  if (!process.env.INVOICE_SECRET) {
    return NextResponse.json({ error: 'INVOICE_SECRET not configured' }, { status: 500 })
  }

  if (password !== process.env.INVOICE_SECRET) {
    return NextResponse.json({ error: 'პაროლი არასწორია' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('invoice_auth', process.env.INVOICE_SECRET, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30, // 30 day
    path: '/',
  })
  return response
}
