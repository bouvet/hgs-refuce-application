import type { WasteRegistration, Report } from "@/lib/types";
import { BackendWasteRepository } from "./backend-waste-repository";

export interface WasteRepository {
  getRegistrations(): Promise<WasteRegistration[]>;
  getRegistrationByDate(date: string): Promise<WasteRegistration | null>;
  saveRegistration(reg: WasteRegistration): Promise<void>;
  deleteRegistration(id: string): Promise<void>;
  getRegistrationsByDateRange(
    from: string,
    to: string,
  ): Promise<WasteRegistration[]>;
  getRegistrationsInPeriod(period: string): Promise<WasteRegistration[]>;
  getReports(): Promise<Report[]>;
  getReportForPeriod(period: string): Promise<Report | null>;
  submitReport(period: string, submittedBy: string): Promise<Report>;
  unlockReport(period: string): Promise<void>;
  /** Accepts a quarter string ("YYYY-Qn") or a full date string ("YYYY-MM-DD"). */
  isPeriodLocked(periodOrDate: string): Promise<boolean>;
  getReportForDate(date: string): Promise<Report | null>;
}

const API_URL = "/api";

/**
 * Build a repository scoped to a single location. User identity is
 * injected server-side by the Next.js API proxy from the Better Auth
 * session — no `userId` argument is required (or accepted) here.
 */
export function createWasteRepository(locationId: string): WasteRepository {
  return new BackendWasteRepository(API_URL, locationId);
}
