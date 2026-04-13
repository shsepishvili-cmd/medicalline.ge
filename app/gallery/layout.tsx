import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/app/lib/seo';

export const metadata = buildPageMetadata({
  path: '/gallery',
  title: 'Gallery | Medical Line',
  description:
    'Medical Line Georgia-ს გალერეა: აპარატურა, ინსტალაციები, შოურუმი და სტომატოლოგიური ტექნოლოგიების ფოტოები.',
  keywords: ['medical line gallery', 'სტომატოლოგიური აპარატურის ფოტოები'],
});

export default function GalleryLayout({ children }: { children: ReactNode }) {
  return children;
}
