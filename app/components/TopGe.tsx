"use client";

import { useEffect } from 'react';

export default function TopGe() {
  useEffect(() => {
    const existing = document.getElementById('top-ge-script');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = 'top-ge-script';
    script.src = "https://counter.top.ge/counter.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return (
    <div className="relative z-[110] flex items-center justify-center min-h-[50px] my-6">
      <div id="top-ge-counter-container" data-site-id="118515"></div>
    </div>
  );
}
