import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Eye, Calendar, Clock } from 'lucide-react';
import PostInteractions from '../../components/PostInteractions';

export const metadata = {
  title: 'Eighteeth-ის ოფიციალური წარმომადგენელი საქართველოში | Medical Line',
  description: 'რატომ არის ტექნიკური მხარდაჭერა, სწრაფი რეაგირება და სრული სერვისი აპარატურის ფასზე მნიშვნელოვანი.',
  openGraph: {
    title: 'Eighteeth-ის ოფიციალური წარმომადგენელი საქართველოში',
    description: 'ოფიციალური წარმომადგენლობა კლინიკებისთვის მხოლოდ სტატუსი არ არის - ეს არის პროგნოზირებადი ექსპლუატაცია.',
    url: 'https://medicalline.ge/blog/eighteeth-oficialuri-warmomadgeneli',
    siteName: 'Medical Line Georgia',
    images: [{ url: 'https://medicalline.ge/images/expo_hero.jpeg', width: 1200, height: 630 }], // 👈 სურათი შეგიძლია შეცვალო
    locale: 'ka_GE',
    type: 'article',
  },
};

export default function BlogPost() {
  const fakeViews = 2150 + Math.floor(Math.random() * 100);
  
  const postUrl = "https://medicalline.ge/blog/eighteeth-oficialuri-warmomadgeneli";
  const postTitle = "Eighteeth-ის ოფიციალური წარმომადგენელი საქართველოში";

  return (
    <article className="min-h-screen bg-white font-sans text-slate-900 pb-20">
      
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md py-4 border-b border-slate-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center">
          <Link href="/blog" className="flex items-center gap-2 font-bold text-sm text-blue-600 hover:text-blue-800 transition-colors">
            <ChevronLeft size={18} /> ბლოგზე დაბრუნება
          </Link>
          <div className="flex items-center gap-4 text-slate-500 font-semibold text-xs">
            <span className="flex items-center gap-1"><Calendar size={14}/> 17 თებ, 2026</span>
            <span className="flex items-center gap-1"><Clock size={14}/> 6 წთ</span>
            <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-blue-600">
              <Eye size={14} /> <span suppressHydrationWarning>{fakeViews}</span>
            </span>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="pt-32 pb-16 px-6 bg-slate-50 border-b border-slate-100">
        <div className="max-w-3xl mx-auto text-center">
          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold mb-6 inline-block uppercase tracking-wider">
            პარტნიორობა და სერვისი
          </span>
          <h1 className="text-3xl md:text-5xl font-black leading-tight mb-6 text-slate-900">
            Eighteeth-ის ოფიციალური წარმომადგენელი საქართველოში
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-12 text-[17px] text-slate-700 leading-relaxed font-medium">
        
        <p className="mb-6 text-lg">
          როცა სკანერი, ენდომოტორი ან რენტგენი პირველად „გაჩერდება“ სამუშაო დღეს, პრობლემა იშვიათად არის მხოლოდ მოწყობილობა. რეალური ზიანი იწყება მაშინ, როცა ვერ პოულობთ პასუხისმგებელ მხარეს: ვინ გააკეთებს დიაგნოსტიკას, ვინ მოიტანს სათადარიგო ნაწილს, ვინ გაწვრთნის ასისტენტს ისე, რომ ხვალიდან იგივე შეცდომა არ განმეორდეს. 
        </p>

        <div className="my-10 border-l-4 border-blue-600 bg-blue-50 p-6 rounded-r-xl">
          <p className="text-xl font-bold text-blue-900 leading-snug">
            ამიტომაც „Eighteeth ოფიციალური წარმომადგენელი საქართველოში“ კლინიკებისთვის მხოლოდ სტატუსი არ არის - ეს არის პროგნოზირებადი ექსპლუატაცია, სწრაფი რეაგირება და შედეგზე პასუხისმგებლობა.
          </p>
        </div>

        <h2 className="text-2xl font-black text-slate-900 mt-12 mb-4">რას ნიშნავს ოფიციალური წარმომადგენლობა პრაქტიკაში</h2>
        <p className="mb-6">
          ოფიციალური წარმომადგენლობა ყველაზე მეტად იქ იგრძნობა, სადაც კლინიკა ყოველდღიურად მუშაობს - სწრაფი პაციენტნაკადით, რამდენიმე კაბინეტით და მკაცრი გრაფიკით. ამ პირობებში მთავარი კითხვა ასეთია: „თუ რაიმე მოხდა, რამდენად სწრაფად დავბრუნდებით ნორმალურ რეჟიმში?“
        </p>
        <p className="mb-6">
          ოფიციალური არხით <Link href="/catalog" className="text-blue-600 hover:underline font-bold">მიწოდებული მოწყობილობა</Link> ნიშნავს, რომ თქვენ იღებთ პროდუქტის იდენტიფიცირებად წარმოშობას, მწარმოებლის სტანდარტის შესაბამის კონფიგურაციას და საგარანტიო პოლიტიკას, რომელიც რეალურად მუშაობს. 
        </p>
        <p className="mb-8">
          კიდევ ერთი პრაქტიკული მნიშვნელობა არის პასუხისმგებლობის ერთიანი ჯაჭვი. როცა ერთი პარტნიორი აკეთებს შერჩევას, მიწოდებას, ინსტალაციას, კალიბრაციას და შემდეგ მომსახურებას, გაუგებრობა მნიშვნელოვნად მცირდება.
        </p>

        <h2 className="text-2xl font-black text-slate-900 mt-12 mb-4">რატომ აქვს მნიშვნელობა ექსკლუზიურ და ოფიციალურ არხს</h2>
        <p className="mb-6">
          დენტალური მოწყობილობის შეძენა ხშირად ერთჯერადი ტრანზაქცია კი არა, მრავალწლიანი ოპერაციული გადაწყვეტილებაა. აქ „ფასი“ მხოლოდ შესყიდვის ეტაპს არ ეხება - რეალური ხარჯი იკრიბება დგომის დროიდან, დაუგეგმავი ვიზიტებიდან, გადაგდებული მასალებიდან და იმ შემთხვევებიდან, როცა ექიმი უკან ბრუნდება ძველ მეთოდზე.
        </p>
        <p className="mb-8">
          ოფიციალური წარმომადგენელი ამ რისკებს ამცირებს სამ დონეზე: <br/>
          <strong>1. სწორი კონფიგურაცია</strong> - ინტრაორალური სკანერის შემთხვევაში ხშირად გადამწყვეტია კომპიუტერის მონაცემები და ქსელის სტაბილურობა.<br/>
          <strong>2. სწორი ინსტალაცია და კალიბრაცია</strong> - განსაკუთრებით რენტგენოლოგიურ აპარატებში.<br/>
          <strong>3. გუნდის ტრენინგი</strong> - რეალური კლინიკური სცენარებით და არა მხოლოდ ზოგადი დემოთი.
        </p>

        <h2 className="text-2xl font-black text-slate-900 mt-12 mb-6">რომელ კატეგორიებში გვხვდება Eighteeth და სად არის მაღალი ეფექტი</h2>

        <h3 className="text-xl font-bold text-slate-800 mb-3">ინტრაორალური სკანერები</h3>
        <p className="mb-6">
          ინტრაორალური სკანერი ხშირად პირველი ნაბიჯია ციფრულ სტომატოლოგიაში, მაგრამ მხოლოდ მაშინ მუშაობს „სრულად“, როცა პროცესები დალაგებულია. ოფიციალური წარმომადგენელი აქ გეხმარებათ არა მხოლოდ მოწყობილობის მიწოდებაში, არამედ სამუშაო ნაკადის მოწყობაში: სკანირების სცენარები, რეტრაქციის რუტინა და ფაილების გაგზავნა.
        </p>

        <h3 className="text-xl font-bold text-slate-800 mb-3">ენდომოტორები და აპექს ლოკატორთან ინტეგრაცია</h3>
        <p className="mb-6">
          ენდოდონტიის შემთხვევაში დრო და კონტროლი პირდაპირ კავშირშია უსაფრთხოებასთან. ტექნიკური პარტნიორი აქ ამცირებს „ადამიანური შეცდომის“ რისკს და აჩქარებს ახალი ექიმის ადაპტაციას.
        </p>

        <h3 className="text-xl font-bold text-slate-800 mb-3">პორტატული და კლინიკური რენტგენი</h3>
        <p className="mb-6">
          რენტგენოლოგიური მოწყობილობის შეფასება მხოლოდ გამოსახულების ხარისხით არ სრულდება. მნიშვნელოვანია გამეორებების რაოდენობა, ოპერატორის კომფორტი, დამცავი რეჟიმები და მომსახურების ხელმისაწვდომობა.
        </p>

        <h3 className="text-xl font-bold text-slate-800 mb-3">დენტალური ტომოგრაფია (CBCT) და მიკროსკოპები</h3>
        <p className="mb-8">
          ტომოგრაფიის და მიკროსკოპის შეძენა კლინიკის მომსახურების სპექტრს ცვლის. რეალური მხარდაჭერა ნიშნავს, რომ კლინიკას აქვს პარტნიორი როგორც ინსტალაციის ეტაპზე, ასევე შემდეგ - როცა ჩნდება კითხვები პროტოკოლებზე, ერგონომიკაზე ან პროგრამულ განახლებებზე.
        </p>

        <h2 className="text-2xl font-black text-slate-900 mt-12 mb-4">როგორ არჩევს კლინიკა ოფიციალურ წარმომადგენელს</h2>
        <p className="mb-6">გადაწყვეტილების მიღებისას დასვით კონკრეტული კითხვები:</p>
        <ul className="list-disc pl-6 mb-6 space-y-2 text-slate-700">
          <li>ვინ აკეთებს ადგილზე ინსტალაციას და კალიბრაციას?</li>
          <li>ტრენინგი არის ერთჯერადი თუ სტრუქტურირებული თქვენი გუნდისთვის?</li>
          <li>როგორ მუშაობს ტექნიკური მხარდაჭერა სამუშაო საათების გარეთ?</li>
          <li>როგორია სათადარიგო ნაწილების ხელმისაწვდომობა?</li>
        </ul>

        <h2 className="text-2xl font-black text-slate-900 mt-12 mb-4">რას მოიცავს სრული ციკლის მხარდაჭერა</h2>
        <p className="mb-6">
          კონსულტაცია, მიწოდება, ადგილზე ინსტალაცია, ტრენინგი და <Link href="/blog" className="text-blue-600 hover:underline font-bold">24/7 ტექნიკური მხარდაჭერა</Link>. საქართველოში Eighteeth-ის ოფიციალური და ექსკლუზიური პარტნიორი არის <strong>Medical Line Georgia</strong>, რომელიც მოწყობილობის შერჩევიდან ინსტალაციამდე ერთ პასუხისმგებლობის ჯაჭვს გაძლევთ.
        </p>

        <h2 className="text-2xl font-black text-slate-900 mt-12 mb-4">როდის არის საუკეთესო დრო განახლებისთვის</h2>
        <p className="mb-8">
          ტექნიკის განახლება საუკეთესოდ მუშაობს მაშინ, როცა კლინიკა ამას აკეთებს არა „ავარიის“ შემდეგ, არამედ წინასწარ დაგეგმილად. ასევე სწორი დროა, როცა კლინიკა ახალ ექიმს იმატებს ან ახალ მიმართულებას ხსნის.
        </p>

        {/* Final CTA/Quote Block */}
        <div className="mt-12 mb-16 bg-slate-900 text-white p-8 rounded-2xl">
          <p className="text-lg font-bold leading-relaxed">
            დასასრულს ერთი პრაქტიკული აზრი - ტექნოლოგია კლინიკაში მაშინ იწყებს მუშაობას, როცა თქვენ არ ფიქრობთ ტექნოლოგიაზე. თუ მოწყობილობა სწორად არის შერჩეული, სწორად დაყენებული და მხარდაჭერა რეალურად ხელმისაწვდომია, ექიმი ბრუნდება მთავარზე: დიაგნოსტიკაზე, გადაწყვეტილებაზე და მკურნალობის ხარისხზე.
          </p>
        </div>

        {/* 🔗 გაზიარება და ფეისბუქ კომენტარები (ჩვენი სუპერ ბლოკი) */}
        <PostInteractions postUrl={postUrl} postTitle={postTitle} />

      </div>
    </article>
  );
}