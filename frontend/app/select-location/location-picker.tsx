"use client";

import { useState, useTransition } from "react";
import { Leaf } from "lucide-react";
import { submitLocation } from "./actions";

type Location = { id: string; name: string };

type LocationPickerProps = {
  locations: Location[];
  defaultLocationId: string;
};

export function LocationPicker({
  locations,
  defaultLocationId,
}: LocationPickerProps) {
  const [selected, setSelected] = useState(defaultLocationId);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await submitLocation(formData);
        });
      }}
      className="flex flex-col items-center gap-8 w-full max-w-sm"
    >
      <input type="hidden" name="locationId" value={selected} />

      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center justify-center size-14 rounded-2xl bg-primary text-primary-foreground mb-2">
          <Leaf className="size-7" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Velg lokasjon</h1>
        <p className="text-sm text-muted-foreground">
          Hvilken lokasjon skal du arbeide med?
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-border bg-card outline-none transition-colors focus:border-primary"
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={!selected || pending}
          className="w-full h-11 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-default"
          style={{
            background:
              selected && !pending ? "var(--primary)" : "var(--muted)",
            color: selected && !pending ? "white" : "var(--muted-foreground)",
          }}
        >
          {pending ? "Lagrer..." : "Fortsett"}
        </button>
      </div>
    </form>
  );
}
