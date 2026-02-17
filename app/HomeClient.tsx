import { Metadata } from 'next';
import MedicalLineHome from './HomeClient'; // შენი მთავარი კოდი

// ✅ აი ეს არის შენი "ქართული გასაღები" Google-ისთვის
export const metadata: Metadata = {
  title: 'მედიქალ ლაინ ჯორჯია | სტომატოლოგიური აპარატურა Eighteeth',
  description: 'მედიქალ ლაინ ჯორჯია - Eighteeth-ის ოფიციალური დისტრიბუტორი საქართველოში. შეიძინეთ ენდომოტორები, სკანერები და რადიოლოგიური აპარატურა საუკეთესო ფასად.',
  keywords: [
    'მედიქალ ლაინ ჯორჯია', 
    'სტომატოლოგიური აპარატურა', 
    'Eighteeth საქართველო', 
    'ენდომოტორები', 
    'ინტრაორალური სკანერი', 
    'სტომატოლოგიური მაღაზია'
  ],
  alternates: {
    canonical: 'https://medicalline.ge',
  },
  openGraph: {
    title: 'მედიქალ ლაინ ჯორჯია | ინოვაციური სტომატოლოგია',
    description: 'Eighteeth-ის სტომატოლოგიური აპარატურის ოფიციალური წარმომადგენლობა საქართველოში.',
    url: 'https://medicalline.ge',
    siteName: 'Medical Line Georgia',
    images: [
      {
        url: 'https://medicalline.ge/images/cover.png',
        width: 1200,
        height: 630,
        alt: 'Medical Line Georgia - Eighteeth',
      },
    ],
    locale: 'ka_GE',
    type: 'website',
  },
};

export default function Page() {
  return <MedicalLineHome />;
}