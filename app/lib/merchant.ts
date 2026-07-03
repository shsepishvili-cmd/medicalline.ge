export const merchant = {
  legalName: 'შპს მედიქალ ლაინ ჯორჯია',
  brand: 'Medical Line Georgia',
  identificationNumber: '417893569',
  address: 'თბილისი, დ. ჯაბიძის ქ. #8',
  phone: '+995 514 011 116',
  phoneHref: 'tel:+995514011116',
  email: 'info@medicalline.ge',
  emailHref: 'mailto:info@medicalline.ge',
  hours: 'ორშაბათი–პარასკევი, 10:00–18:00',
  website: 'https://medicalline.ge',
} as const

export const legalLinks = [
  { href: '/terms-and-conditions', label: 'წესები და პირობები' },
  { href: '/privacy-policy', label: 'კონფიდენციალურობის პოლიტიკა' },
] as const
