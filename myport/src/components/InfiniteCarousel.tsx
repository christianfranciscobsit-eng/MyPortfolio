"use client";

import { useRef, useEffect, useState } from "react";

interface InfiniteCarouselProps {
  images: string[];
  cardWidth?: number;
  cardHeight?: number;
  gap?: number;
  speed?: number; // px per second
}

export default function InfiniteCarousel({
  images,
  cardWidth = 210,
  cardHeight = 297,
  gap = 20,
  speed = 60,
}: InfiniteCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const posRef = useRef(0);
  const pausedRef = useRef(false);
  const lastTimeRef = useRef<number | null>(null);

  // Duplicate images enough times to fill seamlessly
  const repeated = [...images, ...images, ...images];
  const itemW = cardWidth + gap;
  const loopWidth = images.length * itemW;

  useEffect(() => {
    const step = (timestamp: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      if (!pausedRef.current) {
        posRef.current += speed * delta;
        if (posRef.current >= loopWidth) posRef.current -= loopWidth;
        if (trackRef.current) {
          trackRef.current.style.transform = `translateX(-${posRef.current}px)`;
        }
      }
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [speed, loopWidth]);

  return (
    <div
      style={{
        width: "100%",
        overflow: "hidden",
        position: "relative",
        height: `${cardHeight + 40}px`,
        display: "flex",
        alignItems: "center",
      }}
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => {
        pausedRef.current = false;
        lastTimeRef.current = null;
      }}
    >
      {/* Left fade */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: "120px", zIndex: 2,
        background: "linear-gradient(to right, var(--bg-primary, #0a0e1e), transparent)",
        pointerEvents: "none",
      }} />
      {/* Right fade */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: "120px", zIndex: 2,
        background: "linear-gradient(to left, var(--bg-primary, #0a0e1e), transparent)",
        pointerEvents: "none",
      }} />

      <div
        ref={trackRef}
        style={{
          display: "flex",
          gap: `${gap}px`,
          willChange: "transform",
          alignItems: "center",
        }}
      >
        {repeated.map((src, i) => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              width: `${cardWidth}px`,
              height: `${cardHeight}px`,
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              border: "2px solid rgba(255,255,255,0.08)",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "scale(1.05)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 16px 48px rgba(0,0,0,0.6)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.4)";
            }}
          >
            <img
              src={src}
              alt={`carousel-${i}`}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none", userSelect: "none" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
