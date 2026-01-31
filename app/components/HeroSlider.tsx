"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";

type Slide = {
  badge: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  image: string;
};

export default function HeroSlider() {
  const slides: Slide[] = [
    {
      badge: "Medical Line Georgia",
      title: "CBCT და 3D დიაგნოსტიკა",
      subtitle: "მაღალი ხარისხის გამოსახულება კლინიკებისთვის",
      cta: "დემოს დაჯავშნა",
      href: "/contact",
      image: "/images/f350.png",
    },
    {
      badge: "Medical Line Georgia",
      title: "ინტრაორალური სკანერები",
      subtitle: "სწრაფი და ზუსტი ციფრული ანაბეჭდები",
      cta: "ფასის მოთხოვნა",
      href: "/contact",
      image: "/images/helios.png",
    },
    {
      badge: "Medical Line Georgia",
      title: "სტომატოლოგიური სავარძლები",
      subtitle: "კომფორტი პაციენტისთვის და ერგონომიკა ექიმისთვის",
      cta: "კატალოგის ნახვა",
      href: "/catalog",
      image: "/images/hager-g4.jpg",
    },
  ];

  return (
    <Swiper
      modules={[Autoplay, Pagination]}
      autoplay={{ delay: 3800, disableOnInteraction: false }}
      pagination={{ clickable: true }}
      loop
      className="rounded-3xl overflow-hidden"
    >
      {slides.map((s) => (
        <SwiperSlide key={s.title}>
          <div className="relative h-[360px]">
            <img
              src={s.image}
              alt={s.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/55" />

            <div className="relative z-10 flex h-full items-center text-white">
              <div className="mx-auto w-full max-w-6xl px-6">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs">
                    {s.badge}
                  </div>

                  <h2 className="mt-4 text-3xl font-bold md:text-4xl">{s.title}</h2>
                  <p className="mt-2 text-white/90">{s.subtitle}</p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <a
                      href={s.href}
                      className="rounded-xl bg-white px-5 py-3 font-medium text-slate-900 hover:opacity-90 transition"
                    >
                      {s.cta}
                    </a>
                    <a
                      href="/catalog"
                      className="rounded-xl border border-white/40 px-5 py-3 hover:bg-white/10 transition"
                    >
                      კატალოგი
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
