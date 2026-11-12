import { Noto_Sans_Georgian } from 'next/font/google';

const notoGeorgian = Noto_Sans_Georgian({
  subsets: ['georgian', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-georgian',
});

export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${notoGeorgian.variable} academy-font`}>{children}</div>;
}
