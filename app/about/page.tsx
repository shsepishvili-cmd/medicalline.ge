export default function About() {
  return (
    <main className="bg-white min-h-screen">
      
      {/* Header Section - მუქი ლურჯი ფონი */}
      <section className="bg-blue-900 py-24 text-white text-center relative overflow-hidden">
        {/* ფონის დეკორაცია (პატარა წრეები) */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        
        <h1 className="text-4xl md:text-6xl font-black mb-6 relative z-10">ჩვენს შესახებ</h1>
        <p className="max-w-2xl mx-auto text-blue-100 text-lg md:text-xl px-4 relative z-10 font-medium">
          Medical Line Georgia — სტომატოლოგიური აპარატურის წამყვანი მომწოდებელი საქართველოში 2014 წლიდან.
        </p>
      </section>

      {/* Content Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-16 items-center">
        
        {/* მარცხენა მხარე - ტექსტი */}
        <div className="space-y-8">
          <div>
             <h4 className="text-blue-600 font-bold uppercase tracking-widest text-sm mb-2">ვინ ვართ ჩვენ</h4>
             <h2 className="text-3xl md:text-4xl font-black text-blue-900 leading-tight">ჩვენი მისია და მიზნები</h2>
          </div>
          
          <p className="text-slate-600 text-lg leading-relaxed">
            ჩვენი მიზანია ქართველ სტომატოლოგებს მივაწოდოთ მსოფლიო დონის ციფრული ტექნოლოგიები, რომლებიც ამარტივებს მუშაობის პროცესს და ზრდის პაციენტების კმაყოფილებას. ჩვენ არ ვყიდით უბრალოდ ნივთებს, ჩვენ გთავაზობთ სრულ ტექნოლოგიურ გადაწყვეტილებებს.
          </p>

          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xl">✓</div>
              <p className="text-slate-800 font-bold">მხოლოდ სერტიფიცირებული და ორიგინალი აპარატურა</p>
            </div>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xl">✓</div>
              <p className="text-slate-800 font-bold">საკუთარი სერვის-ცენტრი და სწრაფი რეაგირება</p>
            </div>
          </div>
        </div>

        {/* მარჯვენა მხარე - სურათი */}
        <div className="relative">
          {/* მთავარი სურათი */}
          <div className="h-[500px] rounded-[3rem] overflow-hidden border-8 border-slate-50 shadow-2xl relative z-10">
             <img 
               src="/images/4.jpg" 
               alt="Team working" 
               className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
             />
          </div>

          {/* "10+ წელი" მოტივტივე ბარათი */}
          <div className="absolute -bottom-10 -left-10 z-20 bg-blue-600 text-white p-8 rounded-[2rem] shadow-xl hidden md:block">
             <div className="text-6xl font-black mb-1">10+</div>
             <div className="text-sm font-bold uppercase tracking-widest opacity-90">წელი ბაზარზე</div>
          </div>

          {/* დეკორატიული წერტილები უკან */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-50 -z-10"></div>
        </div>

      </section>
    </main>
  );
}