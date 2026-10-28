"use client";

import { useEffect, useRef } from "react";

/**
 * Barra fina no topo que acompanha quanto da página já foi lida. É só
 * decoração (`aria-hidden`); a largura muda por `transform`, sem refazer o
 * layout a cada rolagem.
 */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const root = document.documentElement;
      const max = root.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      barRef.current?.style.setProperty("transform", `scaleX(${progress})`);
    };
    const schedule = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div
      ref={barRef}
      aria-hidden="true"
      className="site-progress fixed inset-x-0 top-0 z-50 h-0.5"
      style={{ transform: "scaleX(0)" }}
    />
  );
}
