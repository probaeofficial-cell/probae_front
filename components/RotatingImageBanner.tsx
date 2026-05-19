"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";

const IMAGE_POOL = [
  "https://images.unsplash.com/photo-1527324688151-0e627063f2b1?w=800&q=85",
  "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=800&q=85",
  "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=800&q=85",
  "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800&q=85",
  "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&q=85",
  "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&q=85",
  "https://images.unsplash.com/photo-1508747703725-719777637510?w=800&q=85",
  "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&q=85",
  "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=800&q=85",
  "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=85",
  "https://images.unsplash.com/photo-1577069861033-55d04cec4ef5?w=800&q=85",
  "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=800&q=85",
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=85",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=85",
];

function pickDifferent(pool: string[], exclude: string): string {
  const available = pool.filter((s) => s !== exclude);
  return available[Math.floor(Math.random() * available.length)];
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
  const [cells, setCells] = useState<Cell[]>(() =>
    IMAGE_POOL.slice(0, TOTAL).map((src) => ({ src, version: 0 }))
  );
  const srcsRef = useRef<string[]>(IMAGE_POOL.slice(0, TOTAL));

  useEffect(() => {
    let tid: ReturnType<typeof setTimeout>;
    let alive = true;

    const tick = () => {
      if (!alive) return;
      const idx = Math.floor(Math.random() * TOTAL);
      const newSrc = pickDifferent(IMAGE_POOL, srcsRef.current[idx]);
      srcsRef.current[idx] = newSrc;
      setCells((prev) =>
        prev.map((c, i) => (i === idx ? { src: newSrc, version: c.version + 1 } : c))
      );
      tid = setTimeout(tick, 800 + Math.random() * 1400);
    };

    tid = setTimeout(tick, 1200);
    return () => { alive = false; clearTimeout(tid); };
  }, []);

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
                      style={{
                        flex: 1,
                        position: "relative",
                        overflow: "hidden", // Clips the image to form the parallelogram
                        borderRadius: `${RADIUS}px`,
                        ...(col === 3 ? { flex: 1.2 } : {}), // Bleed column 4 slightly more
                      }}
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