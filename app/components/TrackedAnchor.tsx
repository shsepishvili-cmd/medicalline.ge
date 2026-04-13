"use client";

import type { ReactNode } from "react";
import { trackEvent, trackLead } from "@/app/lib/analytics";

type Props = {
  children: ReactNode;
  className?: string;
  eventName?: string;
  href: string;
  leadChannel?: string;
  rel?: string;
  target?: string;
  trackingParams?: Record<string, string | number | boolean | undefined>;
};

export default function TrackedAnchor({
  children,
  className,
  eventName,
  href,
  leadChannel,
  rel,
  target,
  trackingParams,
}: Props) {
  const handleClick = () => {
    if (leadChannel) {
      trackLead(leadChannel, trackingParams);
      return;
    }

    if (eventName) {
      trackEvent(eventName, trackingParams);
    }
  };

  return (
    <a href={href} target={target} rel={rel} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
