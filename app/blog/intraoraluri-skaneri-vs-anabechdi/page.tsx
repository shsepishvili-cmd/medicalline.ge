import BlogContent from './BlogContent'

export const metadata = {
  title: 'ინტრაორალური სკანერი თუ კლასიკური ანაბეჭდი? | Medical Line Blog',
  description: 'რომელი მეთოდია უფრო ეფექტური თანამედროვე სტომატოლოგიაში? სიზუსტის, დროის და ხარჯების შედარებითი ანალიზი კლინიკებისთვის.',
  openGraph: {
    title: 'ინტრაორალური სკანერი თუ კლასიკური ანაბეჭდი - რომელი სჯობს?',
    description: 'დრო, სიზუსტე და პაციენტის კომფორტი: როგორ ავირჩიოთ ოპტიმალური მეთოდი კონკრეტული კლინიკური შემთხვევისთვის.',
    url: 'https://medicalline.ge/blog/intraoraluri-skaneri-vs-anabechdi',
    siteName: 'Medical Line Georgia',
    images: [
      {
        url: 'https://medicalline.ge/images/finscan.png',
        width: 1200,
        height: 630,
        alt: 'ინტრაორალური სკანერი vs ანაბეჭდი',
      },
    ],
    locale: 'ka_GE',
    type: 'article',
  },
}

export default function Page() {
  return <BlogContent />
}
