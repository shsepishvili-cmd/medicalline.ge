import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script'; 
import GoogleTranslate from './GoogleTranslate';
import AnalyticsBootstrap from './components/AnalyticsBootstrap';
import BotpressScripts from './components/BotpressScripts';
import { Suspense } from 'react';
import { organizationSchema, siteConfig, websiteSchema } from './lib/seo';
import MerchantFooter from './components/MerchantFooter';

function trackingEnv(name: string, fallback = '') {
  const value = (process.env[name] || fallback).trim();
  if (!value || value.includes('function(){') || value.includes('Attempted to call')) return '';
  return value;
}

const GTM_ID = trackingEnv('NEXT_PUBLIC_GTM_ID');
const GA_MEASUREMENT_ID = trackingEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID');
const CLARITY_ID = trackingEnv('NEXT_PUBLIC_CLARITY_ID');
const META_PIXEL_ID = trackingEnv('NEXT_PUBLIC_META_PIXEL_ID', '805898554494944');

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  referrer: 'origin-when-cross-origin',
  title: {
    default: siteConfig.title,
    template: '%s'
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
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
    title: siteConfig.title,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.title,
      },
    ],
    locale: siteConfig.locale,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gtmIdJson = JSON.stringify(GTM_ID);
  const gaMeasurementIdJson = JSON.stringify(GA_MEASUREMENT_ID);
  const clarityIdJson = JSON.stringify(CLARITY_ID);
  const metaPixelIdJson = JSON.stringify(META_PIXEL_ID);

  return (
    <html lang="ka" className="scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationSchema(), websiteSchema()])
          }}
        />
      </head>
      <body>
        {GTM_ID ? (
          <Script
            id="gtm-base"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer',${gtmIdJson});
              `
            }}
          />
        ) : null}
        {GA_MEASUREMENT_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script
              id="ga4-base"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  window.gtag = gtag;
                  gtag('js', new Date());
                  gtag('config', ${gaMeasurementIdJson}, { send_page_view: false });
                `
              }}
            />
          </>
        ) : null}
        {CLARITY_ID ? (
          <Script
            id="clarity-base"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(c,l,a,r,i,t,y){
                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", ${clarityIdJson});
              `
            }}
          />
        ) : null}

        {GTM_ID ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        ) : null}

        {META_PIXEL_ID ? (
          <>
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
                fbq('init', ${metaPixelIdJson});
              `
            }} />
            <noscript>
              <img 
                height="1" 
                width="1" 
                style={{ display: 'none' }} 
                src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
                alt="" 
              />
            </noscript>
          </>
        ) : null}

        <Suspense fallback={null}><AnalyticsBootstrap /></Suspense>

        {children}
        <MerchantFooter />
        
        {/* 🚀 Google Translate Component */}
        <GoogleTranslate />

        {/* 🚀 Chatbot Scripts (Lazy Loaded for Speed) */}
        <BotpressScripts />
      </body>
    </html>
  );
}
