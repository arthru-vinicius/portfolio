"use client";

import { useEffect, useRef } from "react";

import { THEME_CHANGE_EVENT } from "./theme";

type Point = { x: number; y: number; vx: number; vy: number };

/** Distância máxima, em px, para dois pontos se ligarem. */
const LINK_DISTANCE = 130;

function accentRgb(element: Element): string {
  const value = getComputedStyle(element)
    .getPropertyValue("--site-accent")
    .trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(value)?.[1];
  if (hex === undefined) {
    return "52, 211, 153";
  }
  const number = Number.parseInt(hex, 16);
  return `${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}`;
}

/**
 * Rede de pontos na cor do acento, se movendo devagar atrás do topo. É só
 * decoração (`aria-hidden`):
 *
 * - para quando sai da tela ou a aba fica escondida;
 * - com "reduzir movimento" no sistema, desenha uma vez e fica parada;
 * - a densidade acompanha a área, então o celular desenha menos pontos.
 */
export function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas === null || canvas === undefined || !context) {
      return;
    }
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const darkScheme = window.matchMedia("(prefers-color-scheme: dark)");
    let width = 0;
    let height = 0;
    let nodes: Point[] = [];
    let frame = 0;
    let onScreen = true;
    let color = accentRgb(canvas);

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const moving = !motion.matches;
      for (const node of nodes) {
        if (moving) {
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < 0 || node.x > width) node.vx *= -1;
          if (node.y < 0 || node.y > height) node.vy *= -1;
        }
      }
      context.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (a === undefined) continue;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          if (b === undefined) continue;
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance < LINK_DISTANCE) {
            context.strokeStyle = `rgba(${color}, ${(1 - distance / LINK_DISTANCE) * 0.28})`;
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();
          }
        }
      }
      context.fillStyle = `rgba(${color}, 0.7)`;
      for (const node of nodes) {
        context.beginPath();
        context.arc(node.x, node.y, 1.6, 0, Math.PI * 2);
        context.fill();
      }
      if (moving && onScreen && !document.hidden) {
        frame = requestAnimationFrame(draw);
      }
    };

    const restart = () => {
      cancelAnimationFrame(frame);
      draw();
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const box = canvas.getBoundingClientRect();
      width = box.width;
      height = box.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.round(Math.min(70, (width * height) / 14000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
      }));
      restart();
    };

    const recolor = () => {
      color = accentRgb(canvas);
      restart();
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? true;
      restart();
    });
    visibility.observe(canvas);
    document.addEventListener("visibilitychange", restart);
    motion.addEventListener("change", restart);
    darkScheme.addEventListener("change", recolor);
    window.addEventListener(THEME_CHANGE_EVENT, recolor);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", restart);
      motion.removeEventListener("change", restart);
      darkScheme.removeEventListener("change", recolor);
      window.removeEventListener(THEME_CHANGE_EVENT, recolor);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full"
    />
  );
}
