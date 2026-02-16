import type { Metadata } from 'next';
import AirpexContent from './AirpexContent';

export const metadata: Metadata = {
  title: 'AIRPEX - მსოფლიოში ყველაზე პატარა აპექს ლოკატორი',
  description: 'მიმოხილვა: უსადენო დატენვა, 15 გრამი წონა და უმაღლესი სიზუსტე. გაიცანით Eighteeth-ის რევოლუციური პროდუქტი.',
  openGraph: {
    title: 'AIRPEX - რევოლუცია ენდოდონტიაში',
    description: 'მსოფლიოში ყველაზე პატარა აპექს ლოკატორი უსადენო დატენვით.',
    images: ['/images/airpex1.jpg'], 
  },
};

export default function Page() {
  return <AirpexContent />;
}