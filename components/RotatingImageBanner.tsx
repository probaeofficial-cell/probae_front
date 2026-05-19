"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";

const IMAGE_POOL = [
  "/images/banner/img-1.JPG",
  "/images/banner/img-2.JPG",
  "/images/banner/img-3.JPG",
  "/images/banner/img-4.JPG",
  "/images/banner/img-5.JPG",
  "/images/banner/img-6.JPG",
  "/images/banner/img-7.JPG",
  "/images/banner/img-8.JPG",
  "/images/banner/img-9.JPG",
  "/images/banner/img-10.JPG",
  "/images/banner/img-11.JPG",
  "/images/banner/img-12.JPG",
  "/images/banner/img-13.JPG",
  "/images/banner/img-14.JPG",
  "/images/banner/img-15.JPG",
  "/images/banner/img-16.JPG",
  "/images/banner/img-17.JPG",
  "/images/banner/img-18.JPG",
  "/images/banner/img-19.JPG",
  "/images/banner/img-20.JPG",
  "/images/banner/img-21.JPG",
  "/images/banner/img-22.JPG",
  "/images/banner/img-23.JPG",
  "/images/banner/img-24.JPG",
  "/images/banner/img-25.JPG",
  "/images/banner/img-26.JPG",
  "/images/banner/img-27.JPG",
];

function pickDifferent(pool: string[], currentlyShown: string[], currentTileImage: string): string {
  // Find images not currently shown in ANY tile
  const available = pool.filter((s) => !currentlyShown.includes(s));
  
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  
  // Fallback: If all images in the pool are already shown (e.g. pool size <= 12),
  // pick one that isn't the same as the current tile to at least show a change.
  const fallbackAvailable = pool.filter((s) => s !== currentTileImage);
  if (fallbackAvailable.length > 0) {
    return fallbackAvailable[Math.floor(Math.random() * fallbackAvailable.length)];
  }
  
  return pool[0];
}

interface Cell {
  src: string;
  version: number;
}

const SKEW_DEG = 15;       // Defines the angle of the \ and / shapes
const GAP = 12;             // px between cells
const RADIUS = 14;         // Matching the softer radius from design
const TOTAL = 12;

export default function RotatingImageBanner() {
  // Ensure we have exactly TOTAL items, wrapping around if the pool is smaller than TOTAL
  const initialSrcs = Array.from({ length: TOTAL }).map(
    (_, i) => IMAGE_POOL[i % IMAGE_POOL.length]
  );

  const [cells, setCells] = useState<Cell[]>(() =>
    initialSrcs.map((src) => ({ src, version: 0 }))
  );
  const srcsRef = useRef<string[]>(initialSrcs);

  useEffect(() => {
    let tid: ReturnType<typeof setTimeout>;
    let alive = true;

    const tick = () => {
      if (!alive) return;
      const idx = Math.floor(Math.random() * TOTAL);
      const currentTileImage = srcsRef.current[idx];
      const newSrc = pickDifferent(IMAGE_POOL, srcsRef.current, currentTileImage);
      srcsRef.current[idx] = newSrc;
      setCells((prev) =>
        prev.map((c, i) => (i === idx ? { src: newSrc, version: c.version + 1 } : c))
      );
      tid = setTimeout(tick, 800 + Math.random() * 1400);
    };

    tid = setTimeout(tick, 1200);
    return () => { alive = false; clearTimeout(tid); };
  }, []);

  const handleMouseEnter = (idx: number) => {
    const currentTileImage = srcsRef.current[idx];
    const newSrc = pickDifferent(IMAGE_POOL, srcsRef.current, currentTileImage);
    srcsRef.current[idx] = newSrc;
    setCells((prev) =>
      prev.map((c, i) => (i === idx ? { src: newSrc, version: c.version + 1 } : c))
    );
  };

  return (
    <>
      <style>{`
        @keyframes pb-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .pb-fade { animation: pb-fade 0.65s ease forwards; }
      `}</style>

      <div
        style={{
          width: "100%",
          height: "100%",
          background: "transparent",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-10%",
            bottom: "-10%",
            left: "8%",     // Space on the left so the `<` shape doesn't get clipped
            right: "-15%",  // Forces the grid to bleed completely off the right edge
            display: "flex",
            flexDirection: "column",
            gap: `${GAP}px`,
            padding: `${GAP}px`,
            boxSizing: "border-box",
            justifyContent: "center", // Keeps the rows centered vertically
          }}
        >
          {[0, 1, 2].map((row) => {
            // Target Logic:
            // Row 0: \ shape -> positive skew, origin anchored at the bottom
            // Row 1: | shape -> 0 skew, standard rectangle
            // Row 2: / shape -> negative skew, origin anchored at the top
            const rowProps = [
              { flex: 1.25, skew: SKEW_DEG, origin: "bottom center" },
              { flex: 1, skew: 0, origin: "center center" },
              { flex: 1.25, skew: -SKEW_DEG, origin: "top center" }
            ][row];

            return (
              <div
                key={row}
                style={{
                  flex: rowProps.flex,
                  display: "flex",
                  gap: `${GAP}px`,
                  transform: `skewX(${rowProps.skew}deg)`,
                  transformOrigin: rowProps.origin,
                }}
              >
                {[0, 1, 2, 3].map((col) => {
                  const idx = row * 4 + col;
                  const cell = cells[idx];

                  return (
                    <div
                      key={col}
                      onMouseEnter={() => handleMouseEnter(idx)}
                      style={{
                        flex: 1,
                        position: "relative",
                        overflow: "hidden", // Clips the image to form the parallelogram
                        borderRadius: `${RADIUS}px`,
                        cursor: "pointer",
                        ...(col === 3 ? { flex: 1.2 } : {}), // Bleed column 4 slightly more
                      }}
                      className="group"
                    >
                      {/* Counter-skew the image so the food stays straight! */}
                      <div
                        key={cell.version}
                        className="pb-fade"
                        style={{
                          position: "absolute",
                          top: "-35%",
                          bottom: "-35%",
                          left: "-35%",
                          right: "-35%", // Massive overshoot to prevent dead corners from counter-skew
                          transform: `skewX(${-rowProps.skew}deg)`,
                          transformOrigin: "center center",
                        }}
                      >
                        <Image
                          src={cell.src}
                          alt=""
                          fill
                          sizes="(max-width: 1400px) 25vw, 20vw"
                          style={{ objectFit: "cover" }}
                          className="transition-transform duration-700 ease-out group-hover:scale-110"
                          priority={idx < 6}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}