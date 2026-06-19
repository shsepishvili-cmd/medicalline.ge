"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

export default function BotpressScripts() {
  const pathname = usePathname();
  if (pathname === "/invoice" || pathname === "/invoice-login") return null;

  return (
    <>
      <Script
        src="https://cdn.botpress.cloud/webchat/v3.5/inject.js"
        strategy="lazyOnload"
      />
      <Script
        src="https://files.bpcontent.cloud/2026/01/30/20/20260130205533-KAMUYRZQ.js"
        strategy="lazyOnload"
      />
    </>
  );
}
