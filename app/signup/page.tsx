"use client";

import { useState } from 'react';
import { supabase } from '@/app/lib/supabase'; // შენი ბაზის ფაილი
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. ვარეგისტრირებთ მომხმარებელს
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      alert(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // 2. ვინახავთ დამატებით მონაცემებს profiles ცხრილში
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          { 
            id: data.user.id, 
            full_name: fullName, 
            clinic_name: clinicName 
          },
        ]);

      if (profileError) {
        alert("პროფილის შექმნის შეცდომა: " + profileError.message);
      } else {
        alert("რეგისტრაცია წარმატებულია! გთხოვთ შეხვიდეთ სისტემაში.");
        router.push('/login'); // გადაგვყავს ლოგინზე
      }
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-8 text-center">ექიმის რეგისტრაცია</h1>
        <form onSubmit={handleSignup} className="space-y-4">
          <input type="text" placeholder="სახელი და გვარი" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-600 font-bold uppercase text-xs" 
            onChange={(e) => setFullName(e.target.value)} required />
          
          <input type="text" placeholder="კლინიკის დასახელება" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-600 font-bold uppercase text-xs" 
            onChange={(e) => setClinicName(e.target.value)} required />

          <input type="email" placeholder="ელ-ფოსტა" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-600 font-bold uppercase text-xs" 
            onChange={(e) => setEmail(e.target.value)} required />

          <input type="password" placeholder="პაროლი" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-600 font-bold uppercase text-xs" 
            onChange={(e) => setPassword(e.target.value)} required />

          <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-blue-700 transition-all">
            {loading ? 'მუშავდება...' : 'რეგისტრაცია'}
          </button>
        </form>
        <p className="mt-6 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          უკვე გაქვთ ანგარიში? <Link href="/login" className="text-blue-600 underline">შედით</Link>
        </p>
      </div>
    </main>
  );
}