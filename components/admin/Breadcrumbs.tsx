import React from "react";

interface BreadcrumbsProps {
  segments: string[];
}

export function Breadcrumbs({ segments }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1.5 text-[13px] text-neutral-500 font-medium select-none pl-1 mb-4">
      {segments.map((segment, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span className="text-neutral-400 font-normal">/</span>}
          <span className={idx === segments.length - 1 ? "text-neutral-700 font-semibold" : "text-neutral-500"}>
            {segment}
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
}
