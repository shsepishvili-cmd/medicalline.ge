import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script'; 
import GoogleTranslate from './GoogleTranslate';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://medicalline.ge'), 
  title: {
    default: 'Medical Line Georgia | Eighteeth-ის ექსკლუზიური დისტრიბუტორი',
    template: '%s | Medical Line'
  },
  description: 'Eighteeth-ის ოფიციალური წარმომადგენელი და წამყვანი სტომატოლოგიური ბრენდების (Hager, Philden...) პარტნიორი საქართველოში. შეიძინეთ აპარატურა და სავარძლები გარანტიით.',
  keywords: ['სტომატოლოგიური აპარატურა', 'Eighteeth Georgia', 'Hager', 'Philden', 'ენდომოტორი', 'სტომატოლოგიური სავარძელი', 'Medical Line', 'ენდომოტორი', 'ინტრაორალური სკანერი', 'რენტგენი', 'სამედიცინო ტექნიკა', 'Medical Line'],
  icons: {
    icon: '/favicon.ico',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  alternates: {
    canonical: '/',
  },
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
  openGraph: {
    title: 'Medical Line - ციფრული სტომატოლოგია',
    description: 'Eighteeth-ის ოფიციალური წარმომადგენელი და სერვის ცენტრი საქართველოში. ყველაფერი თქვენი კლინიკისთვის.',
    url: 'https://medicalline.ge',
    siteName: 'Medical Line Georgia',
    images: [
      {
        url: '/images/cover.png', 
        width: 1200,
        height: 630,
        alt: 'Medical Line Georgia - Eighteeth Equipment',
      },
    ],
    locale: 'ka_GE',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" className="scroll-smooth">
      <head>
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
        
        {/* 🚀 Meta Pixel Code (Safely Injected) */}
        <Script id="fb-pixel" strategy="afterInteractive" dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '805898554494944');
            fbq('track', 'PageView');
          `
        }} />
        <noscript>
          <img 
            height="1" 
            width="1" 
            style={{ display: 'none' }} 
            src="https://www.facebook.com/tr?id=805898554494944&ev=PageView&noscript=1" 
            alt="" 
          />
        </noscript>

        {children}
        
        {/* 🚀 Google Translate Component */}
        <GoogleTranslate />

        {/* 🚀 Chatbot Scripts (Lazy Loaded for Speed) */}
        <Script 
          src="https://cdn.botpress.cloud/webchat/v3.5/inject.js" 
          strategy="lazyOnload" 
        />
        <Script 
          src="https://files.bpcontent.cloud/2026/01/30/20/20260130205533-KAMUYRZQ.js" 
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}