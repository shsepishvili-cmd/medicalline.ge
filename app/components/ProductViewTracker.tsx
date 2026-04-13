"use client";

import { useEffect } from "react";
import { trackEvent } from "@/app/lib/analytics";

export default function ProductViewTracker({
  productName,
  productCategory,
}: {
  productName: string;
  productCategory: string;
}) {
  useEffect(() => {
    trackEvent("view_product", {
      product_name: productName,
      product_category: productCategory,
    });
  }, [productCategory, productName]);

  return null;
}
