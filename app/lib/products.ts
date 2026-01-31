export type Product = {
  slug: string;
  name: string;
  category: string;
  short: string;
  features: string[];
  cta: "ფასის მოთხოვნა" | "დემოს დაჯავშნა";
};

export const products: Product[] = [
  {
    slug: "helios-intraoral-scanner",
    name: "Helios ინტრაორალური სკანერი",
    category: "ინტრაორალური სკანერები",
    short: "სწრაფი და ზუსტი ციფრული ანაბეჭდები ყოველდღიური მუშაობისთვის.",
    features: ["სწრაფი სკანირება", "მაღალი სიზუსტე", "მარტივი workflow", "კომპაქტური დიზაინი"],
    cta: "ფასის მოთხოვნა",
  },
  {
    slug: "finscan-f350-cbct",
    name: "FinScan F350 CBCT",
    category: "CBCT და გამოსახულება",
    short: "მაღალი ხარისხის 3D დიაგნოსტიკა კლინიკებისთვის.",
    features: ["3D გამოსახულება", "კარგი დეტალიზაცია", "სწრაფი სკანირება", "კლინიკის workflow-ის გაუმჯობესება"],
    cta: "დემოს დაჯავშნა",
  },
  {
    slug: "hager-g4-chair",
    name: "Hager G4 სტომატოლოგიური სავარძელი",
    category: "სტომატოლოგიური სავარძლები",
    short: "საიმედო და კომფორტული სავარძელი ყოველდღიური დატვირთვისთვის.",
    features: ["ერგონომიკა", "კომფორტი პაციენტისთვის", "საიმედო მექანიკა", "სერვისის მხარდაჭერა"],
    cta: "ფასის მოთხოვნა",
  },
];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export const categories = [
  "CBCT და გამოსახულება",
  "ინტრაორალური სკანერები",
  "სტომატოლოგიური სავარძლები",
  "სტომატოლოგიური მიკროსკოპები",
  "სტერილიზაცია",
  "ენდოდონტია",
];
