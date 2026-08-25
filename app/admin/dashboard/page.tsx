"use client";

import React, { useState } from "react";
import { Header } from "@/components/admin/Header";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  MoreHorizontal,
  Check,
  X,
  Phone,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

// ─── Tiny sparkline SVG ───────────────────────────────────────────────────────
function Sparkline({
  points,
  color,
  width = 120,
  height = 45,
  gradientId,
}: {
  points: number[];
  color: string;
  width?: number;
  height?: number;
  gradientId: string;
}) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * height;
    return { x, y };
  });

  const pathD = `M ${coords.map(c => `${c.x},${c.y}`).join(" L ")}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      
      {/* Area gradient fill */}
      <path d={areaD} fill={`url(#${gradientId})`} />
      
      {/* Waveform line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Donut / arc gauge ────────────────────────────────────────────────────────
function RetentionGauge({ value, dark = false }: { value: number; dark?: boolean }) {
  const radius = 42;
  const cx = 56;
  const cy = 56;
  const circumference = Number((2 * Math.PI * radius).toFixed(2));
  const filled = Number(((value / 100) * circumference).toFixed(2));

  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
      <svg width="120" height="120" viewBox="0 0 112 112" className="overflow-visible">
        {/* Background dashed circle */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={dark ? "#333333" : "#dcdcdc"}
          strokeWidth="8"
          strokeDasharray="8 6"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        {/* Foreground solid purple arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#7c26d9"
          strokeWidth="8"
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold text-xl leading-none ${dark ? "text-white" : "text-neutral-900"}`}>{value}%</span>
        <span className={`text-[9px] mt-1 text-center leading-tight ${dark ? "text-neutral-400" : "text-neutral-500"}`}>
          Customer<br />Retention
        </span>
      </div>
    </div>
  );
}

// ─── Sales arc gauge ──────────────────────────────────────────────────────────
function SalesGauge({ value }: { value: number }) {
  const bars = 16;
  const radius = 68;
  const cx = 100;
  const cy = 100;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 110 }}>
      <svg width="200" height="110" viewBox="0 0 200 120">
        {Array.from({ length: bars }).map((_, i) => {
          const angle = 180 - (i / (bars - 1)) * 180;
          const rad = (angle * Math.PI) / 180;
          const x1 = Number((cx + (radius - 14) * Math.cos(rad)).toFixed(2));
          const y1 = Number((cy - (radius - 14) * Math.sin(rad)).toFixed(2));
          const x2 = Number((cx + (radius + 2) * Math.cos(rad)).toFixed(2));
          const y2 = Number((cy - (radius + 2) * Math.sin(rad)).toFixed(2));
          const isActive = i / bars < value / 100;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isActive ? "#7c26d9" : "#e5e7eb"}
              strokeWidth="6"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="absolute bottom-1 flex flex-col items-center">
        <span className="text-neutral-800 font-bold text-2xl">{value}%</span>
        <span className="text-neutral-400 text-[11px]">Sales Goals</span>
      </div>
    </div>
  );
}

// ─── Stat card (top row) ──────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  sub,
  dark,
  delay = 0,
}: {
  title: string;
  value: string;
  sub?: React.ReactNode;
  dark?: boolean;
  delay?: number;
}) {
  return (
    <div
      className={`relative rounded-3xl p-5 flex flex-col justify-between min-h-[175px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer cell-fade-in ${
        dark ? "bg-[#1a1a1a] text-white" : "bg-[#ededed] text-neutral-800"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <span className={`text-xs font-semibold ${dark ? "text-neutral-400" : "text-neutral-500"}`}>
          {title}
        </span>
        <button
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
            dark ? "bg-white text-black hover:bg-neutral-200" : "bg-[#dcdcdc] text-neutral-800 hover:bg-[#c5c5c5]"
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
      <div>
        <p className={`text-3xl font-bold tracking-tight mt-3 ${dark ? "text-white" : "text-neutral-900"}`}>
          {value}
        </p>
        {sub && <div className="mt-1">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Goal progress bar ────────────────────────────────────────────────────────
function GoalBar({
  label,
  color,
  pct,
}: {
  label: string;
  color: string;
  pct: number;
}) {
  return (
    <div className="flex-1">
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ─── Lollipop / candlestick chart (Revenue Overview) ─────────────────────────
function LollipopChart() {
  const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const H = 100;
  const W = 320;
  
  // Data coordinates (y-values on a 0-100 scale, where 0 is top, 100 is bottom)
  const lines = [
    { x: 35, yMin: 85, yMax: 35, dots: [85, 35] },
    { x: 85, yMin: 85, yMax: 45, dots: [85, 45] },
    { x: 135, yMin: 85, yMax: 25, dots: [85, 25], active: true, val: "₹396.27" },
    { x: 185, yMin: 85, yMax: 40, dots: [85, 40] },
    { x: 235, yMin: 85, yMax: 15, dots: [85, 50, 15] },
    { x: 285, yMin: 85, yMax: 50, dots: [85, 50] },
  ];

  return (
    <div className="w-full flex justify-center py-2">
      <svg width={W} height={H + 25} viewBox={`0 0 ${W} ${H + 25}`} className="overflow-visible">
        {lines.map((line, i) => {
          const color = line.active ? "#7c26d9" : "#1a1a1a";
          const strokeWidth = "1.5";
          return (
            <g key={i}>
              {/* Vertical line */}
              <line
                x1={line.x}
                y1={line.yMin}
                x2={line.x}
                y2={line.yMax}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              
              {/* Dots along the line */}
              {line.dots.map((y, dotIdx) => (
                <circle
                  key={dotIdx}
                  cx={line.x}
                  cy={y}
                  r="3.5"
                  fill={line.active ? "#7c26d9" : "#1a1a1a"}
                />
              ))}

              {/* Active value bubble */}
              {line.active && line.val && (
                <g>
                  {/* Bubble body */}
                  <rect
                    x={line.x - 26}
                    y={50}
                    width={52}
                    height={20}
                    rx={10}
                    fill="#7c26d9"
                  />
                  {/* Bubble text */}
                  <text
                    x={line.x}
                    y={63}
                    textAnchor="middle"
                    fill="white"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {line.val}
                  </text>
                </g>
              )}

              {/* Month Label */}
              <text
                x={line.x}
                y={H + 18}
                textAnchor="middle"
                fill="#888888"
                fontSize="11"
                className="font-medium"
              >
                {months[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Category half-donut (Employment Agreement Tracker) ───────────────────────
function CategoryDonut() {
  const segments = [
    { start: -178, end: -92, color: "#5b21b6" }, // Dark purple
    { start: -88, end: -38, color: "#9061d4" },  // Medium purple
    { start: -34, end: -2, color: "#d1c4e9" },   // Light purple
  ];
  const R = 80;
  const cx = 120;
  const cy = 100;
  const strokeW = 28;

  return (
    <svg width="240" height="120" viewBox="0 0 240 120" className="overflow-visible">
      {segments.map((seg, i) => {
        const startRad = (seg.start * Math.PI) / 180;
        const endRad = (seg.end * Math.PI) / 180;
        
        const x1 = Number((cx + R * Math.cos(startRad)).toFixed(2));
        const y1 = Number((cy + R * Math.sin(startRad)).toFixed(2));
        const x2 = Number((cx + R * Math.cos(endRad)).toFixed(2));
        const y2 = Number((cy + R * Math.sin(endRad)).toFixed(2));
        
        const largeArc = (seg.end - seg.start) > 180 ? 1 : 0;
        
        return (
          <path
            key={i}
            d={`M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

// ─── Revenue stream bar (Sales Target chart) ──────────────────────────────────
function RevenueStreamBar({
  label,
  pct,
  value,
  trend,
  active,
}: {
  label: string;
  pct: number;
  value: string;
  trend: string;
  active?: boolean;
}) {
  return (
    <div className="flex flex-col items-center flex-1 min-w-[65px]">
      <span className={`text-xs font-semibold mb-2 ${active ? "text-neutral-900" : "text-neutral-400"}`}>
        {trend}
      </span>

      <div className="relative w-full h-[120px] rounded-2xl bg-white border border-neutral-100 flex flex-col justify-end overflow-visible shadow-sm">
        <div
          className="w-full rounded-b-2xl transition-all duration-500"
          style={{
            height: `${pct}%`,
            backgroundColor: active ? "#7c26d9" : "#c5c5c5",
          }}
        />

        <div
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ bottom: `calc(${pct}% - 6px)` }}
        >
          <div className="bg-[#1a1a1a] text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow whitespace-nowrap">
            {value}
          </div>
        </div>
      </div>

      <span className={`text-xs mt-3 ${active ? "font-bold text-neutral-800" : "text-neutral-400"}`}>
        {label}
      </span>
    </div>
  );
}


// ─── Revenue bar column (Sales Target chart) ──────────────────────────────────
function RevenueBar({
  label,
  pct,
  value,
  badge,
  badgeDir,
  active,
}: {
  label: string;
  pct: number;
  value: string;
  badge: string;
  badgeDir: "up" | "down";
  active?: boolean;
}) {
  const maxH = 80;
  const barH = (pct / 100) * maxH;

  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span
        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full mb-1 ${
          badgeDir === "up"
            ? "bg-emerald-100 text-emerald-700"
            : "text-neutral-500"
        }`}
      >
        {badge} {badgeDir === "up" ? "↗" : "↘"}
      </span>

      <div
        className="relative w-full rounded-xl overflow-hidden flex items-end"
        style={{ height: maxH, background: "#e5e7eb" }}
      >
        <div
          className="w-full rounded-xl transition-all"
          style={{ height: barH, background: active ? "#7c26d9" : "#d1d5db" }}
        />
        <span
          className={`absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
            active ? "bg-[#5b21b6] text-white" : "bg-neutral-200 text-neutral-600"
          }`}
        >
          {value}
        </span>
      </div>

      <span className={`text-[11px] mt-1 ${active ? "font-bold text-neutral-800" : "text-neutral-500"}`}>
        {label}
      </span>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [callAccepted, setCallAccepted] = useState<boolean | null>(null);
  const [revenueFilter, setRevenueFilter] = useState("Monthly");

  const incomePoints = [18, 25, 20, 30, 22, 35, 28, 40, 32, 45, 38, 50];
  const expensePoints = [28, 20, 35, 25, 40, 30, 45, 32, 50, 35, 42, 38];

  const mostOrderedBowls = [
    {
      name: "AAPL",
      price: "₹134.67",
      logo: (
        <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71,19.5 C17.88,20.74 17,21.95 15.66,22 C14.32,22.05 13.89,21.24 12.37,21.24 C10.84,21.24 10.37,21.97 9.1,22.03 C7.79,22.08 6.8,20.74 5.96,19.53 C4.26,17.06 2.97,12.5 4.72,9.47 C5.6,7.95 7.16,6.97 8.86,6.94 C10.15,6.92 11.38,7.82 12.18,7.82 C12.97,7.82 14.45,6.74 16.02,6.9 C16.68,6.93 18.53,7.17 19.74,8.93 C19.64,8.99 17.27,10.37 17.29,13.25 C17.31,16.67 20.14,17.8 20.17,17.82 C20.15,17.88 19.71,19.38 18.71,19.5 M15.97,4.17 C16.63,3.37 17.07,2.28 16.95,1 C16,1.04 14.9,1.6 14.24,2.38 C13.68,3.04 13.19,4.14 13.34,5.39 C14.39,5.47 15.4,4.88 15.97,4.17 Z" />
        </svg>
      ),
    },
    {
      name: "ADS",
      price: "₹156.17",
      logo: (
        <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="3,17 7,17 11,11 7,11" />
          <polygon points="8,17 12,17 17,7 13,7" />
          <polygon points="13,17 17,17 22,3 18,3" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col flex-1 h-full bg-[#fafafa]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.1)] flex flex-col bg-white overflow-hidden">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Header />

        {/* ── Scrollable dashboard body ────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin pr-1">
          {/* ── Row 1: 4 stat cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard
              dark
              title="Total Orders Today"
              value="₹21.5k"
              delay={0}
              sub={
                <div className="flex flex-col gap-0.5 text-[11px] text-neutral-400 mt-1">
                  <div className="flex justify-between w-full">
                    <span>Custom Bowl Orders</span>
                    <span className="text-white font-semibold">₹400</span>
                  </div>
                  <div className="flex justify-between w-full">
                    <span>Standard Bowl Orders</span>
                    <span className="text-white font-semibold">₹630</span>
                  </div>
                </div>
              }
            />

            <StatCard
              title="Revenue Today"
              value="₹3.8k"
              delay={100}
              sub={
                <p className="text-[11px] text-neutral-800 font-semibold mt-1">
                  Payout <span className="text-neutral-500 font-normal">• 7.34k will be available soon</span>
                </p>
              }
            />

            <StatCard
              title="Subscription Active"
              value="3556"
              delay={200}
              sub={
                <p className="text-[11px] text-neutral-800 font-semibold mt-1">
                  Payout <span className="text-neutral-500 font-normal">• 6.2k will be available soon</span>
                </p>
              }
            />

            <div
              className="relative rounded-3xl p-5 flex flex-col justify-between min-h-[175px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer cell-fade-in bg-[#ededed] text-neutral-800"
              style={{ animationDelay: "300ms" }}
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-neutral-500">
                  Customer Retention
                </span>
                <button className="w-7 h-7 rounded-full bg-[#dcdcdc] text-neutral-800 flex items-center justify-center transition-colors hover:bg-[#c5c5c5]">
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-center mt-2">
                <RetentionGauge value={36.5} dark={false} />
              </div>
            </div>
          </div>

          {/* ── Row 2: Grid of 3 Columns (Goal Overview + My Income, Customer Call, Sales Overview + My Expense) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 items-stretch">
            {/* Column 1: Goal Overview + My Income */}
            <div className="flex flex-col gap-4 justify-between h-full">
              {/* Goal Overview */}
              <div
                className="bg-[#1a1a1a] rounded-3xl p-5 flex flex-col justify-between flex-1 min-h-[230px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer cell-fade-in text-white"
                style={{ animationDelay: "400ms" }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold text-sm">Goal Overview</span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-white text-2xl font-bold">Profit ₹30.14 M</span>
                      <span className="text-emerald-400 text-xs font-semibold">+4.5%</span>
                    </div>
                  </div>
                  {/* Horizontal capsules flex layout */}
                  <div className="flex gap-1.5 mt-3">
                    <div className="h-2 rounded-full bg-[#7c26d9] flex-1" style={{ flexGrow: 35 }} />
                    <div className="h-2 rounded-full bg-[#a78bfa] flex-1" style={{ flexGrow: 20 }} />
                    <div className="h-2 rounded-full bg-[#c4b5fd] flex-1" style={{ flexGrow: 25 }} />
                    <div className="h-2 rounded-full bg-neutral-800 flex-1" style={{ flexGrow: 20 }} />
                  </div>
                </div>

                <div>
                  <div className="flex gap-4 text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#7c26d9] inline-block" />
                      Fat Loss
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#a78bfa] inline-block" />
                      Maintain
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#c4b5fd] inline-block" />
                      Muscle Gain
                    </span>
                  </div>
                  
                  {/* Slider indicators */}
                  <div className="flex gap-1.5 mt-3 justify-center">
                    <span className="w-2 h-2 rounded-full bg-[#7c26d9]" />
                    <span className="w-2 h-2 rounded-full bg-neutral-600" />
                    <span className="w-2 h-2 rounded-full bg-neutral-600" />
                  </div>
                </div>
              </div>

              {/* My Income */}
              <div
                className="bg-[#ededed] rounded-3xl p-4 flex flex-col justify-between h-[145px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer cell-fade-in text-neutral-800"
                style={{ animationDelay: "450ms" }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-neutral-600 font-semibold">My income</span>
                </div>
                <div className="flex justify-center py-1">
                  <Sparkline
                    points={incomePoints}
                    color="#4ade80"
                    width={140}
                    height={35}
                    gradientId="income-grad"
                  />
                </div>
                <div className="bg-white border border-neutral-200/80 rounded-full px-2.5 py-0.5 flex items-center gap-1.5 w-fit shadow-sm mt-0.5">
                  <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center text-white">
                    <span className="text-[8px]">▲</span>
                  </div>
                  <span className="text-neutral-800 font-bold text-[10px]">₹2562.5k</span>
                </div>
              </div>
            </div>

            {/* Column 2: Customer Call (Elongated) */}
            <div
              className="relative rounded-3xl overflow-hidden min-h-[390px] h-full shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer cell-fade-in"
              style={{ animationDelay: "550ms" }}
            >
              {/* Header overlaid on top of photo */}
              <div className="absolute top-0 left-0 right-0 z-10 p-5">
                <p className="text-white font-bold text-lg leading-tight drop-shadow-md">Customer Call</p>
                <p className="text-white/80 text-xs mt-0.5 drop-shadow-sm">Facebook Leads</p>
              </div>

              {/* Full-bleed photo */}
              <img
                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&h=520&q=80"
                alt="Customer with headset"
                className="w-full h-full object-cover object-top absolute inset-0"
                style={{ minHeight: "390px" }}
              />

              {/* Purple gradient overlay on top portion */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(124,38,217,0.75) 0%, rgba(124,38,217,0.4) 35%, transparent 60%)",
                }}
              />

              {/* Bottom white info panel pinned to bottom */}
              <div className="absolute bottom-0 left-0 right-0 z-10 bg-white rounded-t-3xl px-4 pt-4 pb-4 shadow-2xl">
                {/* Name + label */}
                <div className="flex flex-col items-center mb-3">
                  <p className="text-neutral-900 font-bold text-base leading-tight">John kelvin</p>
                  <span className="text-neutral-400 text-[10px] font-semibold mt-0.5">Premium customer</span>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => setCallAccepted(true)}
                    className={`flex-1 text-xs font-bold px-4 py-2.5 rounded-full flex items-center justify-center gap-1.5 transition-all duration-200 ${
                      callAccepted === true
                        ? "bg-emerald-500 text-white scale-95"
                        : "bg-[#7c26d9] text-white hover:bg-[#6b1fc4] hover:scale-[1.02]"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </button>
                  <button
                    onClick={() => setCallAccepted(false)}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                      callAccepted === false
                        ? "bg-red-500 border-red-500 text-white scale-95"
                        : "border-neutral-200 text-neutral-400 hover:text-red-500 hover:border-red-400 hover:scale-105"
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Column 3: Sales Overview + My Expense */}
            <div className="flex flex-col gap-4 justify-between h-full">
              {/* Sales Overview */}
              <div
                className="bg-[#ededed] rounded-3xl p-5 flex flex-col justify-between flex-1 min-h-[230px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer cell-fade-in text-neutral-800"
                style={{ animationDelay: "600ms" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-neutral-800 font-semibold text-sm">Sales Overview</span>
                  <button className="text-neutral-400 hover:text-neutral-600">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex justify-center my-1">
                  <SalesGauge value={65.2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-3 border border-neutral-200/20 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Number of Sales</span>
                      <span className="text-[9px] bg-[#7c26d9] text-white font-bold px-2 py-0.5 rounded-full">4.5%</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-neutral-800 font-bold text-lg">2,402</span>
                      <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    </div>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-3 border border-neutral-200/20 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Total Sales</span>
                      <span className="text-[9px] bg-black text-white font-bold px-2 py-0.5 rounded-full">2.5%</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-neutral-800 font-bold text-lg">₹42.3K</span>
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* My Expense */}
              <div
                className="bg-[#ededed] rounded-3xl p-4 flex flex-col justify-between h-[145px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer cell-fade-in text-neutral-800"
                style={{ animationDelay: "500ms" }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span className="text-xs text-neutral-600 font-semibold">My expense</span>
                </div>
                <div className="flex justify-center py-1">
                  <Sparkline
                    points={expensePoints}
                    color="#fb923c"
                    width={140}
                    height={35}
                    gradientId="expense-grad"
                  />
                </div>
                <div className="bg-white border border-neutral-200/80 rounded-full px-2.5 py-0.5 flex items-center gap-1.5 w-fit shadow-sm mt-0.5">
                  <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center text-white">
                    <span className="text-[8px]">▼</span>
                  </div>
                  <span className="text-neutral-800 font-bold text-[10px]">₹3462.2k</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Row 4: Custom sections matching design screenshot ──────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Left Column (spans 2 on large screens) */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* Row 1: Bowls + Revenue */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Most Ordered Bowls (1/3 width) */}
                <div
                  className="bg-[#ededed] rounded-3xl p-5 flex flex-col justify-between shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer cell-fade-in text-neutral-800"
                  style={{ animationDelay: "650ms" }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-neutral-800 font-semibold text-sm">Most Ordered Bowls</span>
                    <button className="text-neutral-400 hover:text-neutral-600">
                      <MoreHorizontal className="w-5 h-5 rotate-90" />
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {mostOrderedBowls.map((bowl, index) => (
                      <div key={index} className="flex items-center gap-3 border border-[#7c26d9]/30 bg-white rounded-2xl px-4 py-2">
                        <div className="text-black bg-neutral-100 p-1.5 rounded-full flex items-center justify-center">
                          {bowl.logo}
                        </div>
                        <div>
                          <div className="text-neutral-800 font-bold text-xs leading-tight">{bowl.name}</div>
                          <div className="text-neutral-400 text-[10px] font-semibold">{bowl.price}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button className="flex-1 bg-[#5b21b6] hover:bg-[#4c1d95] text-white text-[11px] font-bold py-2 rounded-full transition-colors">
                      ignore
                    </button>
                    <button className="flex-1 bg-[#5b21b6] hover:bg-[#4c1d95] text-white text-[11px] font-bold py-2 rounded-full transition-colors">
                      Buy
                    </button>
                  </div>
                </div>

                {/* Revenue Overview (2/3 width) */}
                <div
                  className="md:col-span-2 bg-[#ededed] rounded-3xl p-5 flex flex-col justify-between shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer cell-fade-in text-neutral-800"
                  style={{ animationDelay: "700ms" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-neutral-800 font-semibold text-sm">Revenue Overview</span>
                    <div className="flex items-center gap-1 text-xs text-neutral-500 font-semibold cursor-pointer hover:text-neutral-700">
                      <span>Monthly</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <LollipopChart />
                </div>
              </div>

              {/* Row 2: Sales Target by Revenue Streams */}
              <div
                className="bg-[#ededed] rounded-3xl p-6 flex flex-col justify-between shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer cell-fade-in text-neutral-800"
                style={{ animationDelay: "750ms" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-neutral-800 font-semibold text-sm">Sales Target by Revenue Streams</span>
                  <button className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-neutral-600 hover:bg-neutral-100 shadow-sm transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
                <div className="my-4">
                  <span className="text-neutral-800 font-bold text-4xl">₹22.5K</span>
                </div>
                <div className="flex gap-4 items-end justify-between mt-2">
                  <RevenueStreamBar label="Whatsapp" pct={20} value="₹2.5K" trend="20% ↘" />
                  <RevenueStreamBar label="Instagram" pct={45} value="₹4.3K" trend="45% ↘" />
                  <RevenueStreamBar label="Facebook" pct={70} value="₹92.8K" trend="70% ↗" active />
                  <RevenueStreamBar label="Others" pct={50} value="₹38.3K" trend="50% ↘" />
                </div>
              </div>
            </div>

            {/* Right Column (spans 1 on large screens) */}
            <div
              className="bg-[#ededed] rounded-3xl p-6 flex flex-col justify-between shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer cell-fade-in text-neutral-800"
              style={{ animationDelay: "800ms" }}
            >
              <div>
                <span className="text-neutral-500 text-sm font-semibold block">Employment Agreement Tracker</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-neutral-800 font-bold text-xl">Category Overview</span>
                  <button className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white hover:bg-neutral-800 shadow-sm transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="relative flex justify-center items-center my-6 min-h-[140px]">
                <CategoryDonut />
                <div className="absolute bottom-2 flex flex-col items-center">
                  <span className="text-neutral-800 font-bold text-4xl tracking-tight">1000</span>
                  <span className="text-neutral-400 text-[10px] font-semibold mt-1">Total Employees</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 w-full mt-4 border-t border-neutral-200/50 pt-4">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#5b21b6]" />
                    Brekfast
                  </div>
                  <span className="text-xl font-bold text-neutral-800 mt-1">50%</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#9061d4]" />
                    Lunch
                  </div>
                  <span className="text-xl font-bold text-neutral-800 mt-1">30%</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#d1c4e9]" />
                    Dinner
                  </div>
                  <span className="text-xl font-bold text-neutral-800 mt-1">20%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
