"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent, trackPageView } from "@/app/lib/analytics";

export default function AnalyticsBootstrap() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trackedScrollMarks = useRef<Set<number>>(new Set());

  useEffect(() => {
    const query = searchParams.toString();
    const path = query ? `${pathname}?${query}` : pathname;

    trackedScrollMarks.current.clear();
    trackPageView(path);
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
