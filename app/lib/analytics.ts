"use client";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim() ?? "";
export const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID?.trim() ?? "";
export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "805898554494944";

type EventParams = Record<string, string | number | boolean | undefined>;

function hasWindow() {
  return typeof window !== "undefined";
}

function pushDataLayer(payload: Record<string, unknown>) {
  if (!hasWindow()) return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);
}

export function trackEvent(eventName: string, params: EventParams = {}) {
  pushDataLayer({ event: eventName, ...params });

  if (hasWindow() && typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }

  if (hasWindow() && typeof window.clarity === "function") {
    try {
      window.clarity("event", eventName);
    } catch {
      // Clarity is optional.
    }
  }
}

export function trackPageView(path: string, title?: string) {
  const pageTitle = title ?? (hasWindow() ? document.title : path);

  pushDataLayer({
    event: "page_view",
    page_path: path,
    page_title: pageTitle,
  });

  if (hasWindow() && typeof window.gtag === "function") {
    window.gtag("event", "page_view", {
      page_path: path,
      page_title: pageTitle,
    });
  }

  if (hasWindow() && typeof window.fbq === "function") {
    window.fbq("track", "PageView");
  }
}

export function trackLead(channel: string, params: EventParams = {}) {
  trackEvent("generate_lead", { channel, ...params });

  if (hasWindow() && typeof window.fbq === "function") {
    window.fbq("track", "Lead", { channel, ...params });
  }
}
