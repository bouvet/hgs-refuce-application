"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  year: number;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function YearAccordion({
  year,
  count,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[15px] font-semibold">{year}</span>
          <span className="text-xs text-muted-foreground">
            {count} {count === 1 ? "rapport" : "rapporter"}
          </span>
        </div>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && <div className="flex flex-col gap-2 p-2">{children}</div>}
    </div>
  );
}
