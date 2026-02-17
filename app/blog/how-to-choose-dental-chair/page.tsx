import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Share2, CheckCircle2, ChevronRight, Phone } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'როგორ შევარჩიოთ იდეალური სტომატოლოგიური დანადგარი? | Medical Line',
  description: 'სრული გზამკვლევი ექიმებისთვის: 6 მთავარი კრიტერიუმი სავარძლის შესარჩევად და Hager G4 პრემიუმ მოდელის დეტალური მიმოხილვა.',
  keywords: ['სტომატოლოგიური სავარძელი', 'Hager G4', 'სტომატოლოგიური დანადგარი', 'ერგონომიკა', 'Medical Line Georgia', 'სტომატოლოგიური კლინიკის აღჭურვა'],
  openGraph: {
    title: 'როგორ შევარჩიოთ იდეალური სტომატოლოგიური დანადგარი?',
    description: 'სრული გზამკვლევი და Hager G4 მოდელის მიმოხილვა.',
    url: 'https://medicalline.ge/blog/how-to-choose-dental-chair',
    siteName: 'Medical Line Georgia',
    images: [
      {
        url: 'https://medicalline.ge/images/hager-g4.jpg', // ❗️ 100% მუშა სრული ლინკი 
        width: 1200,
        height: 630,
        alt: 'Hager G4 Dental Chair'
      }
    ],
    locale: 'ka_GE',
    type: 'article',
  }
};

export default function BlogPost() {
  return (
    <main className="min-h-screen bg-white pt-32 pb-24 px-6 font-sans text-slate-900">
      <article className="max-w-4xl mx-auto">
        
        {/* Header / Back Link */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/blog" className="inline-flex items-center gap-2 text-slate-500 font-bold hover:text-blue-600 transition underline decoration-2 uppercase text-xs tracking-widest">
            <ArrowLeft size={18}/> ყველა სტატია
          </Link>
          <button className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-full transition-colors">
             <Share2 size={20} />
          </button>
        </div>

        {/* Article Hero */}
        <header className="mb-12">
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">
            <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full border border-blue-100">რჩევები ექიმებს</span>
            <span className="flex items-center gap-1.5"><Calendar size={14} /> 15 თებერვალი, 2026</span>
            <span className="flex items-center gap-1.5"><Clock size={14} /> 4 წთ. საკითხავი</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-[1.1] mb-8">
            როგორ შევარჩიოთ იდეალური სტომატოლოგიური დანადგარი? <span className="text-blue-600">სრული გზამკვლევი</span>
          </h1>
          
          <div className="relative w-full aspect-video md:aspect-[21/9] bg-slate-100 rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-100 mb-12">
             <Image 
               src="/images/hager-g4.jpg" 
               alt="სტომატოლოგიური სავარძელი Hager G4" 
               fill 
               className="object-cover hover:scale-105 transition-transform duration-700"
               priority
             />
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
          </div>
        </header>

        {/* Content Body */}
        <div className="prose prose-lg prose-slate max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:italic prose-headings:tracking-tighter prose-a:text-blue-600 prose-img:rounded-[2rem]">
          
          <p className="text-xl font-bold text-slate-600 leading-relaxed mb-10">
            სტომატოლოგიური სავარძელი ნებისმიერი კლინიკის "გულია". ის არ არის უბრალოდ ავეჯი ან ინტერიერის ნაწილი — ის არის თქვენი მთავარი სამუშაო ინსტრუმენტი, რომელიც პირდაპირ მოქმედებს თქვენს პროდუქტიულობაზე, ჯანმრთელობასა და პაციენტის კმაყოფილებაზე.
          </p>

          <p>
            ახალი კლინიკის გახსნისას ან ძველი აპარატურის განახლებისას, ექიმები ხშირად დგანან რთული არჩევანის წინაშე: ბაზარი გაჯერებულია უამრავი მოდელით, სხვადასხვა ფასითა და მახასიათებლებით. ამ ვრცელ გზამკვლევში დეტალურად განვიხილავთ იმ <strong>6 კრიტიკულ კრიტერიუმს</strong>, რომელიც დანადგარის შეძენამდე უნდა გაითვალისწინოთ.
          </p>

          <hr className="my-12 border-slate-100" />

          <h2 className="text-2xl text-slate-900 mb-6 flex items-center gap-3">
             <span className="bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-xl not-italic text-xl">1</span>
             ექიმის ერგონომიკა: თქვენი ჯანმრთელობა ფასდაუდებელია
          </h2>
          <p>
            სტატისტიკის თანახმად, სტომატოლოგების 70%-ზე მეტს კარიერის განმავლობაში ზურგის, კისრის ან მაჯის ქრონიკული ტკივილები აწუხებს. არასწორად შერჩეული დანადგარი ამ პრობლემის მთავარი გამომწვევია.
          </p>
          <ul>
            <li><strong>ინსტრუმენტების მიწოდების სისტემა:</strong> არსებობს ორი მთავარი ტიპი – ზედა მიწოდება (Whip arm) და ქვედა მიწოდება (Hanging). ზედა მიწოდების სისტემა ამცირებს ხელის დაძაბულობას, რადგან შლანგების წონას მექანიზმი იჭერს.</li>
            <li><strong>სივრცე ფეხებისთვის:</strong> სავარძლის ბაზა ისე უნდა იყოს კონსტრუირებული, რომ ექიმს შეეძლოს პაციენტთან მაქსიმალურად ახლოს მიჯდომა (9 და 12 საათის პოზიციებზე).</li>
            <li><strong>მულტიფუნქციური პედალი (Foot Control):</strong> ინფექციის კონტროლისა და ერგონომიკისთვის აუცილებელია, რომ სავარძლის მოძრაობა და ინსტრუმენტების ჩართვა ფეხის პედლით კონტროლდებოდეს.</li>
          </ul>

          <h2 className="text-2xl text-slate-900 mt-12 mb-6 flex items-center gap-3">
             <span className="bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-xl not-italic text-xl">2</span>
             პაციენტის კომფორტი და კლინიკის პრესტიჟი
          </h2>
          <p>
            როდესაც პაციენტი კაბინეტში შემოდის, პირველი რასაც აფასებს და გრძნობს, სტომატოლოგიური სავარძელია. სტრესისა და შიშის შესამცირებლად, მისი კომფორტი უმნიშვნელოვანესია.
          </p>
          <ul>
            <li><strong>სინქრონიზებული მოძრაობა:</strong> ხარისხიან სავარძლებს აქვთ საზურგისა და დასაჯდომის სინქრონიზებული მოძრაობა. პაციენტს ტანსაცმელი არ ექაჩება და არ უწევს ზევით-ქვევით ჩოჩვა.</li>
            <li><strong>ტყავის მასალა:</strong> პრემიუმ მოდელებში გამოყენებული ულტრა-რბილი, ეკო-ტყავის ან მიკროფიბერის საფარი პაციენტს ისეთ კომფორტს უქმნის, რომ ხანგრძლივი პროცედურებიც კი შეუმჩნევლად მიფრინავს.</li>
          </ul>

          <h2 className="text-2xl text-slate-900 mt-12 mb-6 flex items-center gap-3">
             <span className="bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-xl not-italic text-xl">3</span>
             ტექნოლოგიური აღჭურვილობა და მართვა
          </h2>
          <p>
            ციფრულ ეპოქაში მექანიკური ღილაკები წარსულს ბარდება. ექიმისა და ასისტენტის ბლოკზე განთავსებული სენსორული ეკრანები (Touch Screens) ბევრად მარტივი გასაწმენდია და ამცირებს ჯვარედინი დაბინძურების რისკს. პროგრამირებადი მეხსიერება კი ერთი ღილაკის დაჭერით აბრუნებს სავარძელს სასურველ პოზაში.
          </p>

          <h2 className="text-2xl text-slate-900 mt-12 mb-6 flex items-center gap-3">
             <span className="bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-xl not-italic text-xl">4</span>
             ოპერაციული განათება: მეტი ვიდრე სინათლე
          </h2>
          <p>
            მოერიდეთ მოძველებულ ჰალოგენურ ნათურებს. თანამედროვე უჩრდილო LED განათება არის ეკონომიური, არ აცხელებს ქსოვილებს და აქვს კომპოზიტის რეჟიმი (Anti-cure mode), რომელიც ხელს უშლის საბჟენი მასალის ნაადრევ პოლიმერიზაციას.
          </p>

          <h2 className="text-2xl text-slate-900 mt-12 mb-6 flex items-center gap-3">
             <span className="bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-xl not-italic text-xl">5</span>
             ინფექციის კონტროლი და ჰიგიენა
          </h2>
          <p>
            დანადგარი ისე უნდა იყოს აწყობილი, რომ მისი დეზინფექცია მარტივად და სწრაფად ხდებოდეს. უპირატესობა მიანიჭეთ მოდელებს გლუვი ზედაპირებით, 90°-ით მბრუნავი საყფურთხებლითა და შლანგების Anti-retraction სისტემით.
          </p>

          <h2 className="text-2xl text-slate-900 mt-12 mb-6 flex items-center gap-3">
             <span className="bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-xl not-italic text-xl">6</span>
             საიმედოობა და პოსტ-საგარანტიო მომსახურება
          </h2>
          <p>
            რა ხდება გაფუჭების შემთხვევაში? უმნიშვნელოვანესია, რომ მომწოდებელს (როგორც Medical Line Georgia-ს) ჰყავდეს სერტიფიცირებული ინჟინრების გუნდი და ადგილზე ჰქონდეს სათადარიგო ნაწილების მარაგი  ტექნიკური მხარდაჭერისთვის.
          </p>

          <hr className="my-12 border-slate-100" />

          {/* Hager G4 Highlight Section */}
          <div className="bg-blue-50 p-8 md:p-12 rounded-[3rem] border border-blue-100 my-12">
            <h3 className="text-3xl font-black uppercase italic text-slate-900 mb-6 mt-0">
              რატომ უნდა აირჩიოთ <span className="text-blue-600">Hager G4?</span>
            </h3>
            <p className="font-bold text-slate-600 mb-8">
              თუ ეძებთ პრემიუმ კლასის დანადგარს, რომელიც ზემოთ ჩამოთვლილ ყველა კრიტერიუმს აკმაყოფილებს, Hager Dent-ის ფლაგმანი მოდელი G4 იდეალური არჩევანია:
            </p>
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-blue-600 shrink-0 mt-1" />
                <p className="m-0 text-sm font-bold text-slate-700"><strong className="text-slate-900 uppercase">მიკროფიბერის ტყავი:</strong> ანატომიური საფარი, რომელიც პაციენტს მაქსიმალურ კომფორტს უქმნის.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-blue-600 shrink-0 mt-1" />
                <p className="m-0 text-sm font-bold text-slate-700"><strong className="text-slate-900 uppercase">ალუმინის ბაზა:</strong> ჩამოსხმული ალუმინის კონსტრუქცია უზრუნველყოფს აბსოლუტურ სტაბილურობას.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-blue-600 shrink-0 mt-1" />
                <p className="m-0 text-sm font-bold text-slate-700"><strong className="text-slate-900 uppercase">Touch ეკრანები:</strong> წყალგამძლე სენსორული მართვა ექიმისა და ასისტენტის ბლოკზე.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-blue-600 shrink-0 mt-1" />
                <p className="m-0 text-sm font-bold text-slate-700"><strong className="text-slate-900 uppercase">ოპტიკა:</strong> მულტიფუნქციური, უჩრდილო LED განათება კომპოზიტის დაცვის რეჟიმით.</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-10">
              <Link href="/catalog/hager-g4" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all text-center flex items-center justify-center gap-2 shadow-xl no-underline">
                ნახეთ HAGER G4 კატალოგში <ChevronRight size={16} />
              </Link>
              <a href="tel:514011116" className="bg-white text-slate-900 border border-slate-200 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all text-center flex items-center justify-center gap-2 no-underline">
                <Phone size={16} /> დაგვიკავშირდით
              </a>
            </div>
          </div>

          <p className="text-center font-bold text-slate-500 italic">
            სტომატოლოგიური სავარძლის შერჩევა კომპრომისების გარეშე უნდა მოხდეს. ის არის ინვესტიცია თქვენს პროფესიულ სიცოცხლისუნარიანობაში, კლინიკის იმიჯსა და პაციენტების ღიმილში.
          </p>

        </div>
      </article>
    </main>
  );
}