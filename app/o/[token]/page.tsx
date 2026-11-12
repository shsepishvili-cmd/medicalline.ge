import type { Metadata } from 'next'
import { OpenOfferLink } from './OpenOfferLink'

// A secret one-time link: keep it out of search engines and referrer headers.
export const metadata: Metadata = {
  title: 'პერსონალური შეთავაზება | Medical Line Georgia',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function OfferLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <OpenOfferLink token={token} />
}
