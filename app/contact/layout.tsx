import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/app/lib/seo';

export const metadata = buildPageMetadata({
  path: '/contact',
  title: 'Contact | Medical Line',
  description:
    'დაგვიკავშირდით Medical Line Georgia-სთან სტომატოლოგიური აპარატურის, ფასების, ინსტალაციის და სერვისის შესახებ.',
  keywords: ['contact medical line', 'დაგვიკავშირდით', 'სტომატოლოგიური აპარატურის ფასი'],
});

export default function ContactLayout({ children }: { children: ReactNode }) {
  return children;
}
