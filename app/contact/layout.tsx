import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/app/lib/seo';

export const metadata = buildPageMetadata({
  path: '/contact',
  title: 'კონტაქტი | Medical Line Georgia',
  description: 'დაუკავშირდით Medical Line Georgia-ს: თბილისი, დ. ჯაბიძის ქ. #8, +995 514 011 116, ltdmedicalline@gmail.com.',
  keywords: ['Medical Line Georgia კონტაქტი', 'სტომატოლოგიური აპარატურა', 'ტექნიკური სერვისი'],
});

export default function ContactLayout({ children }: { children: ReactNode }) {
  return children;
}
