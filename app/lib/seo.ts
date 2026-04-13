import type { Metadata } from 'next';

export const siteConfig = {
  name: 'Medical Line Georgia',
  shortName: 'Medical Line',
  url: 'https://medicalline.ge',
  title: 'Medical Line Georgia | სტომატოლოგიური აპარატურა და ციფრული ტექნოლოგიები',
  description:
    'Medical Line Georgia არის სტომატოლოგიური აპარატურის, ინტრაორალური სკანერების, CBCT სისტემების, ენდომოტორების და კლინიკური სერვისის ოფიციალური მომწოდებელი საქართველოში.',
  ogImage: '/images/cover.png',
  phone: '+995514011116',
  email: 'ltdmedicalline@gmail.com',
  address: 'დავით ჯაბიძის #8, თბილისი, საქართველო',
  locale: 'ka_GE',
  keywords: [
    'სტომატოლოგიური აპარატურა',
    'ინტრაორალური სკანერი',
    'CBCT',
    'დენტალური ტომოგრაფი',
    'ენდომოტორი',
    'აპექს ლოკატორი',
    'სტომატოლოგიური მიკროსკოპი',
    'Dental equipment Georgia',
    'Medical Line Georgia',
    'Eighteeth Georgia',
  ],
};

export function absoluteUrl(path = '/') {
  if (!path || path === '/') return siteConfig.url;
  return path.startsWith('http') ? path : `${siteConfig.url}${path}`;
}

export function absoluteImageUrl(path?: string) {
  return absoluteUrl(path || siteConfig.ogImage);
}

type PageMetadataInput = {
  path: string;
  title: string;
  description: string;
  image?: string;
  keywords?: string[];
  type?: 'website' | 'article';
};

export function buildPageMetadata({
  path,
  title,
  description,
  image,
  keywords = [],
  type = 'website',
}: PageMetadataInput): Metadata {
  const fullTitle = title.includes(siteConfig.shortName)
    ? title
    : `${title} | ${siteConfig.shortName}`;
  const canonical = absoluteUrl(path);
  const ogImage = absoluteImageUrl(image);

  return {
    title: fullTitle,
    description,
    keywords: [...siteConfig.keywords, ...keywords],
    alternates: {
      canonical,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
    },
  };
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'MedicalBusiness'],
    name: siteConfig.name,
    url: siteConfig.url,
    logo: absoluteImageUrl('/images/ml-logo.png'),
    image: absoluteImageUrl('/images/cover.png'),
    telephone: siteConfig.phone,
    email: siteConfig.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'დავით ჯაბიძის #8',
      addressLocality: 'Tbilisi',
      addressCountry: 'GE',
    },
    sameAs: [
      'https://www.facebook.com/medicalline.ge',
      'https://www.instagram.com/medicalgeorgialtd',
      'https://www.tiktok.com/@medicalline',
    ],
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    inLanguage: 'ka-GE',
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
    },
  };
}
