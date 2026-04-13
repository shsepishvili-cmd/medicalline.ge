import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/invoice.html' || pathname === '/invoice') {
    const auth = request.cookies.get('invoice_auth')?.value
    if (auth !== process.env.INVOICE_SECRET) {
      const loginUrl = new URL('/invoice-login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Surrogate-Control', 'no-store')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/invoice.html', '/invoice'],
}
