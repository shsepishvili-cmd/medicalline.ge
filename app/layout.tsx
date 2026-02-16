import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script'; 
import GoogleTranslate from './GoogleTranslate';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://medicalline.ge'), 

  // 1. სათაური და გაუმჯობესებული აღწერა (SEO აუდიტის მიხედვით)
  title: {
    default: 'Medical Line Georgia | Eighteeth-ის ექსკლუზიური დისტრიბუტორი',
    template: '%s | Medical Line'
  },
  description: 'Eighteeth-ის სტომატოლოგიური აპარატურის ოფიციალური წარმომადგენელი საქართველოში. შეიძინეთ ენდომოტორები, ინტრაორალური სკანერები და რენტგენები გარანტიით. დარეგისტრირდით ექიმის კაბინეტში სპეციალური პირობებისთვის!',
  keywords: ['სტომატოლოგიური აპარატურა', 'Eighteeth Georgia', 'ენდომოტორი', 'ინტრაორალური სკანერი', 'რენტგენი', 'სამედიცინო ტექნიკა', 'Medical Line'],

  // 2. ლოგოები
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },

  // 3. კანონიკური ბმული
  alternates: {
    canonical: '/',
  },

  // 4. რობოტები
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // 5. Open Graph (Facebook/Social-ისთვის სურათით)
  openGraph: {
    title: 'Medical Line - ციფრული სტომატოლოგია',
    description: 'Eighteeth-ის ოფიციალური წარმომადგენელი და სერვის ცენტრი საქართველოში. ყველაფერი თქვენი კლინიკისთვის.',
    url: 'https://medicalline.ge',
    siteName: 'Medical Line Georgia',
    images: [
      {
        url: '/images/cover.png', // დარწმუნდი რომ ეს სურათი არსებობს
        width: 1200,
        height: 630,
        alt: 'Medical Line Georgia - Eighteeth Equipment',
      },
    ],
    locale: 'ka_GE',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ka" className="scroll-smooth">
      <head>
        {/* Identity Schema - Google-ს ეუბნება ვინ ხარ (SEO პრიორიტეტი) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MedicalBusiness",
              "name": "Medical Line Georgia",
              "image": "https://medicalline.ge/images/ml-logo.png",
              "@id": "https://medicalline.ge",
              "url": "https://medicalline.ge",
              "telephone": "514011116",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "დ. ჯაბიძის #8",
                "addressLocality": "Tbilisi",
                "addressCountry": "GE"
              }
            })
          }}
        />
      </head>
      <body className={inter.className}>
        {children}
        <GoogleTranslate />
        <Script 
          src="https://cdn.botpress.cloud/webchat/v3.5/inject.js" 
          strategy="afterInteractive" 
        />
        <Script 
          src="https://files.bpcontent.cloud/2026/01/30/20/20260130205533-KAMUYRZQ.js" 
          strategy="afterInteractive"
          defer
        />
      </body>
    </html>
  );
}