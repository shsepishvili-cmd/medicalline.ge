import type { Metadata } from 'next';
import GDDAContent from './GDDAContent'; // იმპორტი ახალი ფაილიდან

// Facebook Metadata (სერვერული)
export const metadata: Metadata = {
  title: 'GDDA DENTAL EXPO 2025 - MEDICAL LINE',
  description: 'ქართული სტომატოლოგიის ახალი ერა: AI, VR, ენდოდონტია და ციფრული ლაბორატორია.',
  openGraph: {
    title: 'GDDA DENTAL EXPO 2025 - MEDICAL LINE',
    description: 'ენდოდონტია, ციფრული ლაბორატორია, ოპტიკა და AI ტომოგრაფია - MEDICAL LINE-ის სრული ანგარიში.',
    url: 'https://medicalline.ge/blog/gdda-expo-2025',
    siteName: 'Medical Line Georgia',
    images: [
      {
        url: 'https://medicalline.ge/images/expo_hero.jpeg', // დარწმუნდი რომ .jpeg სწორია
        width: 1200,
        height: 630,
        alt: 'GDDA Expo 2025 Highlights',
      },
    ],
    locale: 'ka_GE',
    type: 'article',
  },
};

export default function Page() {
  return <GDDAContent />;
}