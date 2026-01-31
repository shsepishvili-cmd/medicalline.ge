export default function Gallery() {
  const images = [
    { src: "/images/helios.png", title: "Helios ინსტალაცია" },
    { src: "/images/f350.png", title: "Finscan F350 შოურუმში" },
    { src: "/images/hager-g4.jpg", title: "Hager G4 კლინიკაში" },
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">ნამუშევრების გალერეა</h1>
      <div className="grid md:grid-cols-3 gap-6">
        {images.map((img, index) => (
          <div key={index} className="group overflow-hidden rounded-2xl shadow-lg bg-white">
            <img 
              src={img.src} 
              className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110" 
            />
            <div className="p-4">
              <p className="font-medium text-slate-700">{img.title}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}