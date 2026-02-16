"use client";
import { useEffect } from 'react';

export default function GoogleTranslate() {
  useEffect(() => {
    if (!document.getElementById('google-translate-script')) {
      const addScript = document.createElement('script');
      addScript.id = 'google-translate-script';
      addScript.setAttribute('src', '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit');
      document.body.appendChild(addScript);
    }
    
    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement({
        pageLanguage: 'ka',
        includedLanguages: 'en,ru',
        autoDisplay: false,
      }, 'google_translate_element');
    };
  }, []);

  const changeLanguage = (langCode: string) => {
    const selectEl = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (selectEl) {
      selectEl.value = langCode;
      selectEl.dispatchEvent(new Event('change'));
    }
  };

  return (
    <>
      <div id="google_translate_element" style={{ display: 'none' }}></div>
      
      {/* დროშების ბლოკი - მობილურზე ავწიეთ უფრო მაღლა (bottom-44) */}
      <div className="fixed md:bottom-24 bottom-44 right-4 z-[101] flex flex-col gap-2">
        <button onClick={() => changeLanguage('en')} className="w-9 h-9 rounded-full border border-slate-200 shadow-md overflow-hidden bg-white"><img src="https://flagcdn.com/w40/gb.png" alt="EN" className="w-full h-full object-cover" /></button>
        <button onClick={() => changeLanguage('ru')} className="w-9 h-9 rounded-full border border-slate-200 shadow-md overflow-hidden bg-white"><img src="https://flagcdn.com/w40/ru.png" alt="RU" className="w-full h-full object-cover" /></button>
        <button onClick={() => changeLanguage('ka')} className="w-9 h-9 rounded-full border border-slate-200 shadow-md bg-white text-[10px] font-bold flex items-center justify-center">GE</button>
      </div>

      <style jsx global>{`
        body { top: 0 !important; }
        .goog-te-banner-frame { display: none !important; }
      `}</style>
    </>
  );
}