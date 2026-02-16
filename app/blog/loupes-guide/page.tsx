import type { Metadata } from 'next';
import LoupesContent from './LoupesContent';

export const metadata: Metadata = {
  title: 'როგორ ავარჩიოთ ბინოკულარული ლუპები? | Medical Line',
  description: 'გზამკვლევი სტომატოლოგებისთვის: გადიდება, წონა და Eighteeth Brilliance-ის უპირატესობები.',
  openGraph: {
    title: 'როგორ ავარჩიოთ ლუპები? Eighteeth Brilliance',
    description: 'გაიგეთ, რა განსხვავებაა Brilliance და Brilliance 48 Pro მოდელებს შორის.',
    images: ['/images/loupes_main.jpg'], 
  },
};

export default function Page() {
  return <LoupesContent />;
}