import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka">
      <body className="bg-slate-50 text-slate-900">
        <nav className="bg-white border-b sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <a href="/" className="text-xl font-bold text-blue-800">Medical Line</a>
            <div className="space-x-6 font-medium">
              <a href="/" className="hover:text-blue-600">მთავარი</a>
              <a href="/catalog" className="hover:text-blue-600">კატალოგი</a>
              <a href="/gallery" className="hover:text-blue-600">გალერეა</a>
              <a href="/contact" className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800">კონტაქტი</a>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}