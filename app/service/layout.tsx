import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/app/lib/seo';

export const metadata = buildPageMetadata({
  path: '/service',
  title: 'Service | Medical Line',
  description:
    'Medical Line Georgia გთავაზობთ ინსტალაციას, ტრენინგს, ტექნიკურ მხარდაჭერას და შემდგომ სერვისს სტომატოლოგიური აპარატურისთვის.',
  keywords: ['dental service georgia', 'სტომატოლოგიური აპარატურის სერვისი'],
});

export default function ServiceLayout({ children }: { children: ReactNode }) {
  return children;
}
