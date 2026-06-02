export type WasteCategory = {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  accent?: string;
};

export type WasteCategoryEntry = {
  categoryId: string;
  weightKg: number;
};

export type WasteRegistration = {
  id: string;
  date: string; // "YYYY-MM-DD"
  entries: WasteCategoryEntry[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

export type Report = {
  id: string;
  period: string; // "YYYY-Qn"
  submittedAt: string;
  submittedBy: string;
};

export type UserRole = "common" | "admin";

export type Location = {
  id: string;
  name: string;
  createdAt: string;
};

export type User = {
  id: string;
  name: string;
  role: UserRole;
  isSuperAdmin?: boolean;
};

export type AdminUser = {
  id: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};
