"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase'; //
import { useRouter } from 'next/navigation';

export default function DoctorDashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null); // დამატებითი ინფორმაციისთვის
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUserAndFetchProfile = async () => {
      // 1. ვამოწმებთ ავტორიზაციას
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }
      
      setUser(user);

      // 2. წამოვიღოთ დამატებითი მონაცემები profiles ცხრილიდან
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }
      
      setLoading(false);
    };

    checkUserAndFetchProfile();
  }, [router]);

  if (loading) return <div className="p-10 text-center uppercase font-black">იტვირთება...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-black uppercase tracking-tighter italic text-slate-900">
            ექიმის კაბინეტი
          </h1>
          {/* 👇 აქ უკვე გამოჩნდება რეგისტრაციისას შეყვანილი სახელი */}
          <p className="text-blue-600 font-bold text-sm uppercase mt-2">
            მოგესალმებით, {profile?.full_name || user?.email}
          </p>
          {profile?.clinic_name && (
            <p className="text-slate-500 font-bold text-xs uppercase italic">
              კლინიკა: {profile.clinic_name}
            </p>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all group">
            <h3 className="font-black uppercase text-xs tracking-widest text-slate-400 mb-4">შეტყობინებები</h3>
            <p className="text-2xl font-black italic">0 ახალი</p>
            <div className="mt-4 h-1 w-12 bg-blue-600 rounded-full group-hover:w-full transition-all"></div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all group">
            <h3 className="font-black uppercase text-xs tracking-widest text-slate-400 mb-4">შეკვეთები</h3>
            <p className="text-2xl font-black italic">ისტორია ცარიელია</p>
            <div className="mt-4 h-1 w-12 bg-orange-500 rounded-full group-hover:w-full transition-all"></div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all group">
            <h3 className="font-black uppercase text-xs tracking-widest text-slate-400 mb-4">პროფილი</h3>
            <p className="text-sm font-bold text-slate-600 italic">მონაცემების რედაქტირება</p>
            <div className="mt-4 h-1 w-12 bg-green-500 rounded-full group-hover:w-full transition-all"></div>
          </div>
        </div>

        <section className="mt-12 bg-blue-600 rounded-[3rem] p-10 text-white shadow-2xl">
          <h2 className="text-2xl font-black uppercase italic mb-4">ჩეთის სისტემა</h2>
          <p className="font-medium opacity-90 mb-6">პაციენტებთან რეალურ დროში კომუნიკაცია მალე დაემატება.</p>
          <button className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-transform">
            გახსენი ჩეთი
          </button>
        </section>
      </div>
    </main>
  );
}