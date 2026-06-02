"use client";

import dynamic from "next/dynamic";

export const RegistrationsTableNoSSR = dynamic(
  () =>
    import("./registrations-table").then((m) => m.RegistrationsTable),
  { ssr: false },
);
