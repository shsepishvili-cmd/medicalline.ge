import type { Metadata } from 'next';
import SupplierContent from './SupplierContent';

export const metadata: Metadata = {
  title: 'როგორ ავარჩიოთ სანდო მომწოდებელი? | Medical Line',
  description: '5 ოქროს წესი სტომატოლოგებისთვის: ოფიციალური დილერი, სერვისი, გარანტია. ნუ გარისკავთ თქვენი ბიზნესით.',
  openGraph: {
    title: 'როგორ ავარჩიოთ სანდო მომწოდებელი? 5 ოქროს წესი',
    description: 'რატომ არის მნიშვნელოვანი სერვისი და ოფიციალური გარანტია?',
    images: ['/images/supplier_main.jpg'], 
  },
};

export default function Page() {
  return <SupplierContent />;
}