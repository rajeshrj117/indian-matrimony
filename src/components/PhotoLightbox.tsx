'use client';

import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

// Fullscreen photo viewer. Swipe or tap the arrows to move between photos;
// tap the backdrop or the X to close. Used anywhere someone should be able
// to see a profile's photos at full size instead of the cropped thumbnail.
export default function PhotoLightbox({
  images,
  startIndex = 0,
  onClose,
}: {
  images: string[];
  startIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(images.length - 1, i + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [images.length, onClose]);

  if (images.length === 0) return null;

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(images.length - 1, i + 1));

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-black"
      onClick={onClose}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (dx > 50) prev();
        else if (dx < -50) next();
        touchStartX.current = null;
      }}
    >
      <div className="flex items-center justify-between px-4 pt-4">
        <span className="text-sm font-bold text-white/80">{index + 1} / {images.length}</span>
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
          <X size={18} color="#fff" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <img src={images[index]} alt="" className="max-h-full max-w-full object-contain" />

        {index > 0 && (
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40"
          >
            <ChevronLeft size={22} color="#fff" />
          </button>
        )}
        {index < images.length - 1 && (
          <button
            onClick={next}
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40"
          >
            <ChevronRight size={22} color="#fff" />
          </button>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pb-6 pt-2">
          {images.map((img, i) => (
            <span
              key={img + i}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === index ? 18 : 6, background: i === index ? '#fff' : 'rgba(255,255,255,0.4)' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
