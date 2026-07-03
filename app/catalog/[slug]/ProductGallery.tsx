"use client";

import Image from 'next/image';
import { useState } from 'react';

export default function ProductGallery({ images, productName }: { images: string[]; productName: string }) {
  const [selectedImage, setSelectedImage] = useState(images[0]);

  return (
    <div className="min-w-0">
      <div className="relative aspect-square bg-[#F8FAFC] rounded-[4rem] flex items-center justify-center p-6 md:p-12 overflow-hidden border border-slate-50">
        <div className="relative w-full h-full">
          <Image src={selectedImage} alt={productName} fill className="object-contain" priority />
        </div>
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3 mt-4" aria-label={`${productName} ფოტოგალერეა`}>
          {images.map((image, index) => {
            const isSelected = image === selectedImage;

            return (
              <button
                key={image}
                type="button"
                onClick={() => setSelectedImage(image)}
                aria-label={`ფოტო ${index + 1}`}
                aria-pressed={isSelected}
                className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-slate-50 transition-colors ${
                  isSelected ? 'border-blue-600' : 'border-transparent hover:border-slate-300'
                }`}
              >
                <Image src={image} alt="" fill sizes="(max-width: 1024px) 25vw, 12vw" className="object-contain p-1" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
