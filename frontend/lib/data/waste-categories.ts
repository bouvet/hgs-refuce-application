import type { WasteCategory } from "@/lib/types";

export const DEFAULT_WASTE_CATEGORIES: WasteCategory[] = [
  {
    id: "restavfall",
    label: "Restavfall",
    icon: "Trash2",
    color: "#6b6e52",
    accent: "#e8e8dc",
  },
  {
    id: "plast",
    label: "Plast",
    icon: "Package",
    color: "#c97b5a",
    accent: "#f5e2d7",
  },
  {
    id: "papp-papir",
    label: "Papp/papir",
    icon: "Newspaper",
    color: "#8b9eb7",
    accent: "#e1e9f2",
  },
  {
    id: "matavfall",
    label: "Matavfall",
    icon: "Apple",
    color: "#6b8e4e",
    accent: "#e0ebd4",
  },
  {
    id: "metall",
    label: "Metall",
    icon: "Wrench",
    color: "#8a8a8a",
    accent: "#e5e5e5",
  },
  {
    id: "glass",
    label: "Glass",
    icon: "Wine",
    color: "#4e8a8a",
    accent: "#d9ebeb",
  },
  {
    id: "ee-avfall",
    label: "EE-avfall",
    icon: "Zap",
    color: "#a17bb3",
    accent: "#ece1f2",
  },
];
