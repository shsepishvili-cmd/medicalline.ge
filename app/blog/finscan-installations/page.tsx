import type { Metadata } from 'next';
import FinscanContent from './FinscanContent'; // იმპორტს ვაკეთებთ მეზობელი ფაილიდან

// აი ეს არის ის მონაცემები, რასაც Facebook დაინახავს
export const metadata: Metadata = {
  title: 'FINSCAN F350 - N1 არჩევანი საქართველოს კლინიკებისთვის',
  description: 'წარმატებული პროექტები: FinScan F350-ის მონტაჟი, უპირატესობები და შედეგები.',
  openGraph: {
    title: 'FINSCAN F350 - N1 არჩევანი საქართველოს კლინიკებისთვის',
    description: 'წარმატებული პროექტები: FinScan F350-ის მონტაჟი, უპირატესობები და შედეგები.',
    // აქ მიუთითე ის ფოტო, რომელიც გინდა რომ გაზიარებისას ჩანდეს (მაგ: f1.jpeg)
    images: ['/images/f1.jpeg'], 
  },
};

export default function Page() {
  return <FinscanContent />;
}