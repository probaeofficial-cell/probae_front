"use client";

/**
 * Client-boundary wrapper for FrameSequenceCanvas.
 *
 * `ssr: false` is only valid inside a Client Component in Next.js 16+.
 * This file is that boundary — Server Components import this file, not
 * FrameSequenceCanvas directly.
 */
import dynamic from "next/dynamic";

const FrameSequenceCanvas = dynamic(
  () => import("@/components/animations/FrameSequenceCanvas"),
  { ssr: false, loading: () => null }
);

export default FrameSequenceCanvas;
