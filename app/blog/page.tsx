import { blogArticles } from './blogData';
import BlogClient from './BlogClient';

export const metadata = {
  title: 'ბლოგი | Medical Line Georgia',
  description: 'სიახლეები და სტატიები თანამედროვე სტომატოლოგიისთვის.',
};

export default function BlogPage() {
  return <BlogClient blogArticles={blogArticles} />;
}

  // ❗️ ეს არის მთავარი ჯადოქრობა! ამის გარეშე Next.js ფეისბუქს არ აჩვენებს
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).FB) {
      (window as any).FB.XFBML.parse();
    }
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      
      {/* Navigation */}
      <nav className="py-6 px-6 bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-blue-600 hover:text-blue-800 transition-colors">
            <ArrowLeft size={20} /> მთავარი გვერდი
          </Link>
          <h1 className="text-xl font-black text-slate-800 tracking-wider">MEDICAL LINE BLOG</h1>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="py-16 px-6 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black mb-6 text-slate-900">სიახლეები და სტატიები</h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            პროფესიული რჩევები, ტექნოლოგიური მიმოხილვები და სიახლეები თანამედროვე სტომატოლოგიისთვის.
          </p>
        </div>
      </header>

      {/* Blog Grid */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogArticles && blogArticles.map((post: any) => (
            <Link 
              href={`/blog/${post.slug}`} 
              key={post.id}
              className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              <div className="relative h-56 w-full overflow-hidden bg-slate-100">
                <Image 
                  src={post.image || '/images/placeholder.jpg'} 
                  alt={post.title} 
                  fill 
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
              </div>
              
              <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 mb-3">
                  <span className="flex items-center gap-1"><Calendar size={14}/> {post.date}</span>
                  <span className="flex items-center gap-1"><Clock size={14}/> {post.readTime}</span>
                </div>
                
                <h3 className="text-xl font-bold mb-3 text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                  {post.title}
                </h3>
                
                <p className="text-slate-500 text-sm mb-6 line-clamp-3 flex-grow">
                  {post.excerpt || post.description || ""}
                </p>
                
                <div className="flex items-center gap-1 text-blue-600 font-bold text-sm mt-auto">
                  სრულად კითხვა <ChevronRight size={16} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Facebook Comments (გასწორებული!) */}
      <section className="py-24 bg-slate-50 px-6 border-t border-slate-200 mt-16 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-20"></div>
        <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-slate-100">
          <h3 className="text-3xl md:text-4xl font-black mb-10 text-center text-slate-900 underline decoration-blue-600 decoration-4 underline-offset-8">
            დისკუსია / გამოხმაურება
          </h3>
          
          <div id="fb-root"></div>
          <Script 
            id="facebook-jssdk"
            async 
            defer 
            crossOrigin="anonymous" 
            src="https://connect.facebook.net/ka_GE/sdk.js#xfbml=1&version=v18.0" 
            strategy="lazyOnload" 
          />
          
          <div className="w-full overflow-hidden rounded-xl flex justify-center">
            {/* ❗️ აქ იხატება კომენტარები */}
            <div 
              className="fb-comments" 
              data-href="https://medicalline.ge/blog" 
              data-width="100%" 
              data-numposts="10"
            ></div>
          </div>
        </div>
      </section>

      {/* TOP.GE COUNTER */}
      <footer className="py-8 flex justify-center bg-slate-50 border-t border-slate-200">
        <div id="top-ge-counter-container" data-site-id="118515"></div>
        <Script src="https://counter.top.ge/counter.js" strategy="afterInteractive" />
      </footer>
    </main>
  );
}