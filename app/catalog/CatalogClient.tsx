"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, CreditCard, ShoppingCart, Plus, Minus, Trash2, X, Send } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { trackEvent } from '@/app/lib/analytics';

interface AiFeature {
  icon: string;
  title: string;
  desc: string;
}

interface Product {
  id: number;
  slug: string;
  name: string;
  img: string;
  cat: string;
  brand?: string;
  description: string;
  specs?: string[];
  aiFeatures?: AiFeature[];
  price?: number | string;
}

type CartItem = Product & { quantity: number };

const CART_KEY = 'medical-line-catalog-cart-v1';

export default function CatalogClient({ initialProducts }: { initialProducts: Product[] }) {
  const [filter, setFilter] = useState('ყველა');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [message, setMessage] = useState('');
  const [challenge, setChallenge] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    clinicName: '',
    city: '',
    phone: '',
    email: '',
    taxId: '',
    comment: '',
    otpCode: '',
  });

  const products = initialProducts || [];
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const categories = ['ყველა', ...Array.from(new Set(products.map(p => p.cat).filter(Boolean)))];

  const filteredProducts = products.filter(p => {
    const matchesFilter = filter === 'ყველა' || p.cat === filter;

    const searchLower = searchQuery.toLowerCase().trim();
    if (!searchLower) return matchesFilter;

    const matchesSearch =
      (p.name && p.name.toLowerCase().includes(searchLower)) ||
      (p.cat && p.cat.toLowerCase().includes(searchLower)) ||
      (p.description && p.description.toLowerCase().includes(searchLower));

    return matchesFilter && matchesSearch;
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) setCart(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const requestPayloadItems = useMemo(() => cart.map((item) => ({
    slug: item.slug,
    name: item.name,
    category: item.cat,
    brand: item.brand || '',
    image: item.img,
    quantity: item.quantity,
  })), [cart]);

  function updateForm(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'phone') {
      setChallenge('');
      setForm((prev) => ({ ...prev, otpCode: '', phone: value }));
    }
  }

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.slug === product.slug);
      if (existing) {
        return prev.map((item) => item.slug === product.slug ? { ...item, quantity: Math.min(99, item.quantity + 1) } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setCartOpen(true);
    setMessage(`${product.name} დაემატა კალათაში.`);
  }

  function setQuantity(slug: string, quantity: number) {
    setCart((prev) => prev
      .map((item) => item.slug === slug ? { ...item, quantity: Math.max(1, Math.min(99, quantity)) } : item)
      .filter((item) => item.quantity > 0));
  }

  async function sendOtp() {
    setMessage('');
    if (!form.phone.trim()) {
      setMessage('ჯერ მიუთითეთ ტელეფონის ნომერი.');
      return;
    }
    setOtpSending(true);
    try {
      const response = await fetch('/api/cart-invoice-requests/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.phone }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'SMS კოდი ვერ გაიგზავნა.');
      setChallenge(payload.challenge);
      setForm((prev) => ({ ...prev, phone: payload.phone || prev.phone, otpCode: '' }));
      setMessage('SMS კოდი გაიგზავნა. შეიყვანეთ კოდი და დაადასტურეთ მოთხოვნა.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'SMS კოდი ვერ გაიგზავნა.');
    } finally {
      setOtpSending(false);
    }
  }

  async function submitInvoiceRequest() {
    setMessage('');
    if (!cart.length) {
      setMessage('კალათა ცარიელია.');
      return;
    }
    if (!challenge) {
      setMessage('ჯერ მიიღეთ SMS კოდი.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/cart-invoice-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, challenge, items: requestPayloadItems }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'მოთხოვნა ვერ გაიგზავნა.');
      setCart([]);
      setChallenge('');
      setForm({ fullName: '', clinicName: '', city: '', phone: '', email: '', taxId: '', comment: '', otpCode: '' });
      setMessage('მოთხოვნა მიღებულია. მალე დაგიკავშირდებით ინვოისის დეტალებით.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'მოთხოვნა ვერ გაიგზავნა.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header & Search სექცია */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 sticky top-0 bg-slate-50/95 backdrop-blur-sm z-40 py-4">
        <Link href="/" className="flex items-center gap-2 text-slate-500 font-bold hover:text-blue-600 transition underline decoration-2">
          <ArrowLeft size={20}/> მთავარზე
        </Link>
        <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase">კატალოგი</h1>
        <div className="flex w-full md:w-auto items-center gap-3">
        <div className="relative flex-1 md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="მოძებნე (მაგ: ენდომოტორი)..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white shadow-xl focus:ring-2 focus:ring-blue-500 font-bold text-sm outline-none text-slate-900"
            value={searchQuery}
            onChange={(e) => {
              const nextValue = e.target.value;
              setSearchQuery(nextValue);
              if (nextValue.trim().length >= 2) {
                trackEvent('catalog_search', { query: nextValue.trim() });
              }
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="relative h-14 min-w-14 px-4 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest"
          aria-label="კალათა"
        >
          <ShoppingCart size={20} />
          <span className="hidden sm:inline">კალათა</span>
          {cartCount > 0 && <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center">{cartCount}</span>}
        </button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap justify-center gap-3 mb-16">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => {
              setFilter(c);
              trackEvent('catalog_filter_select', { category: c });
            }}
            className={`px-6 py-2 rounded-full font-black text-[10px] tracking-widest uppercase transition-all ${filter === c ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((item) => (
            <div key={item.slug} className="group bg-white rounded-[2.5rem] p-6 border border-slate-100 hover:shadow-2xl transition-all flex flex-col items-center overflow-hidden relative">

              <Link href={`/catalog/${item.slug}`} onClick={() => trackEvent('product_card_click', { product_name: item.name, product_category: item.cat, cta_location: 'catalog_grid' })} className="cursor-pointer w-full flex flex-col items-center h-full">
                <div className="relative w-full h-48 mb-6 flex items-center justify-center bg-slate-50 rounded-[2rem] p-4 overflow-hidden">
                  <Image
                    src={item.img}
                    alt={item.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 25vw"
                    className="object-contain group-hover:scale-110 transition-transform duration-700 p-4"
                  />
                </div>
                <div className="w-full text-center mb-6 px-2 flex-grow">
                  <span className="text-[9px] font-black text-blue-600 block mb-3 bg-blue-50 border border-blue-100 w-max mx-auto px-3 py-1.5 rounded-full tracking-widest uppercase">
                    {item.cat || 'პროდუქცია'}
                  </span>
                  <h3 className="text-base font-black text-slate-900 leading-snug min-h-[2.5rem] flex items-center justify-center text-center">
                    {item.name}
                  </h3>
                  {item.price && <p className="text-blue-600 font-black mt-2">{item.price} ₾</p>}
                </div>
              </Link>

              <div className="w-full grid grid-cols-2 gap-2 mt-auto relative z-10">
                <Link href={`/catalog/${item.slug}`} onClick={() => trackEvent('product_card_click', { product_name: item.name, product_category: item.cat, cta_location: 'catalog_button' })} className="flex items-center justify-center py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] hover:bg-blue-600 transition uppercase text-center">
                  ნახვა
                </Link>
                <button type="button" onClick={() => addToCart(item)} className="flex items-center justify-center py-3 bg-orange-500 text-white rounded-xl font-black text-[9px] shadow-lg hover:bg-orange-600 transition uppercase text-center">
                  <ShoppingCart size={12} className="mr-1"/> კალათაში
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center">
            <p className="text-slate-400 font-bold uppercase tracking-widest">პროდუქტი ვერ მოიძებნა</p>
          </div>
        )}
      </div>

      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-stretch justify-end">
          <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white z-10 border-b border-slate-100 p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Medical Line</p>
                <h2 className="text-2xl font-black text-slate-900">ინვოისის კალათა</h2>
              </div>
              <button type="button" onClick={() => setCartOpen(false)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700" aria-label="დახურვა">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {cart.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500 font-bold">
                  კალათა ცარიელია
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.slug} className="grid grid-cols-[72px_1fr_auto] gap-3 rounded-2xl border border-slate-100 p-3 items-center">
                      <div className="relative h-16 rounded-xl bg-slate-50 overflow-hidden">
                        <Image src={item.img} alt={item.name} fill sizes="72px" className="object-contain p-2" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 leading-snug">{item.name}</p>
                        <p className="text-[11px] font-bold text-slate-400">{item.cat}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button type="button" onClick={() => setQuantity(item.slug, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center"><Minus size={13} /></button>
                          <input value={item.quantity} onChange={(event) => setQuantity(item.slug, Number(event.target.value) || 1)} className="w-12 h-7 rounded-lg border border-slate-200 text-center text-xs font-black" inputMode="numeric" />
                          <button type="button" onClick={() => setQuantity(item.slug, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center"><Plus size={13} /></button>
                        </div>
                      </div>
                      <button type="button" onClick={() => setCart((prev) => prev.filter((cartItem) => cartItem.slug !== item.slug))} className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center" aria-label="წაშლა">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-3xl bg-slate-50 p-5 border border-slate-100">
                <h3 className="font-black text-slate-900 mb-4">მონაცემები ინვოისისთვის</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input value={form.fullName} onChange={(e) => updateForm('fullName', e.target.value)} placeholder="სახელი და გვარი" className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                  <input value={form.clinicName} onChange={(e) => updateForm('clinicName', e.target.value)} placeholder="კლინიკის სახელი" className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                  <input value={form.city} onChange={(e) => updateForm('city', e.target.value)} placeholder="ქალაქი" className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                  <input value={form.email} onChange={(e) => updateForm('email', e.target.value)} placeholder="ელფოსტა" type="email" className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                  <input value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} placeholder="ტელეფონი 5XX..." inputMode="tel" className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                  <input value={form.taxId} onChange={(e) => updateForm('taxId', e.target.value)} placeholder="ს/კ ან პირადი ნომერი" className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                  <textarea value={form.comment} onChange={(e) => updateForm('comment', e.target.value)} placeholder="კომენტარი" className="sm:col-span-2 px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 min-h-24" />
                </div>
                <div className="grid sm:grid-cols-[1fr_auto] gap-3 mt-3">
                  <input value={form.otpCode} onChange={(e) => updateForm('otpCode', e.target.value)} placeholder="SMS კოდი" inputMode="numeric" className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-black tracking-widest outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={sendOtp} disabled={otpSending || !form.phone.trim()} className="px-5 py-3 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50">
                    {otpSending ? 'იგზავნება...' : challenge ? 'კოდის ხელახლა მიღება' : 'SMS კოდი'}
                  </button>
                </div>
              </div>

              {message && <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-sm font-bold text-blue-900">{message}</div>}

              <button type="button" onClick={submitInvoiceRequest} disabled={submitting || !cart.length} className="w-full py-5 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-50">
                <Send size={16} /> {submitting ? 'იგზავნება...' : 'ინვოისის მოთხოვნა'}
              </button>
              <a href="https://ganvadeba.credo.ge/account/landing/authorization" target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('financing_click', { product_name: 'cart', product_category: 'cart', cta_location: 'cart_drawer' })} className="w-full py-4 rounded-2xl bg-orange-500 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                <CreditCard size={16} /> განვადების ნახვა
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
