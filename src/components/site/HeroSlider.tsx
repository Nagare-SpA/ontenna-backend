import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useTranslation } from "react-i18next";
import lifeWoman from "@/assets/hero-life-1.jpg";
import productSide from "@/assets/hero-product-1.jpg";
import family from "@/assets/hero-slide-2.jpg";

const SLIDES = [
  { src: lifeWoman, captionKey: "home.slider.worn" },
  { src: productSide, captionKey: "home.slider.device" },
  { src: family, captionKey: "home.slider.together" },
];

export function HeroSlider() {
  const { t } = useTranslation();
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: "center", duration: 28 });
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (embla) setSelected(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    embla.on("select", onSelect);
    onSelect();
  }, [embla, onSelect]);

  // Gentle autoplay; pauses when the tab is hidden.
  useEffect(() => {
    if (!embla) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") embla.scrollNext();
    }, 4500);
    return () => window.clearInterval(id);
  }, [embla]);

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="overflow-hidden rounded-[--radius] hairline shadow-card" ref={emblaRef}>
        <div className="flex">
          {SLIDES.map((s, i) => (
            <div key={i} className="relative min-w-0 flex-[0_0_100%]">
              <img
                src={s.src}
                alt={t(s.captionKey)}
                loading={i === 0 ? "eager" : "lazy"}
                className="aspect-[4/3] w-full object-cover sm:aspect-[16/10]"
              />
              {/* subtle bottom scrim + caption */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-5">
                <p className="text-sm font-medium text-white/90">{t(s.captionKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="mt-4 flex justify-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => embla?.scrollTo(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === selected ? "w-6 bg-primary" : "w-1.5 bg-[hsl(0_0%_100%/0.25)] hover:bg-[hsl(0_0%_100%/0.45)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
