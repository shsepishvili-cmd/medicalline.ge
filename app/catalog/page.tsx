export default function Catalog() {
  const products = [
    { name: "Helios Scanner", category: "სკანერები", img: "/images/helios.png" },
    { name: "Finscan F350", category: "რენტგენი", img: "/images/f350.png" },
    { name: "Hager G4", category: "სავარძლები", img: "/images/hager-g4.jpg" },
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold">პროდუქციის კატალოგი</h1>
        <input type="text" placeholder="ძებნა..." className="border rounded-lg px-4 py-2" />
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {products.map((p, i) => (
          <div key={i} className="border rounded-2xl p-4 bg-white hover:shadow-xl transition">
            <img src={p.img} className="h-48 w-full object-contain mb-4" />
            <span className="text-blue-600 text-sm font-bold uppercase">{p.category}</span>
            <h3 className="text-xl font-bold mt-1">{p.name}</h3>
            <button className="w-full mt-4 bg-slate-900 text-white py-2 rounded-lg">დეტალურად</button>
          </div>
        ))}
      </div>
    </main>
  );
}