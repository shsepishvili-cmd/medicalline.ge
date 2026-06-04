"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent, trackPageView } from "@/app/lib/analytics";

function getVisitorId() {
  const storageKey = "ml_visitor_id";
  const existing = localStorage.getItem(storageKey);
  if (existing) return existing;

  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  localStorage.setItem(storageKey, generated);
  return generated;
}

function recordFirstPartyPageView(path: string) {
  try {
    const visitorId = getVisitorId();
    const payload = JSON.stringify({
      path,
      title: document.title,
      visitorId,
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/page-view", blob);
      return;
    }

    fetch("/api/analytics/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Analytics must never block the page.
  }
}

export default function AnalyticsBootstrap() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trackedScrollMarks = useRef<Set<number>>(new Set());

  useEffect(() => {
    const query = searchParams.toString();
    const path = query ? `${pathname}?${query}` : pathname;

    trackedScrollMarks.current.clear();
    trackPageView(path);
    recordFirstPartyPageView(path);

    if (pathname.startsWith("/blog/")) {
      trackEvent("view_blog_article", {
        page_path: path,
        blog_slug: pathname.split("/").filter(Boolean)[1],
      });
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const maxScroll = doc.scrollHeight - doc.clientHeight;
      if (maxScroll <= 0) return;

      const scrollPercent = Math.round((window.scrollY / maxScroll) * 100);
      const marks = [25, 50, 75, 90];

      for (const mark of marks) {
        if (scrollPercent >= mark && !trackedScrollMarks.current.has(mark)) {
          trackedScrollMarks.current.add(mark);
          trackEvent("scroll_depth", {
            percent: mark,
            page_path: pathname,
          });
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return null;
}
