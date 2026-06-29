import type { WasteRegistration, Report } from "@/lib/types";
import { dateToQuarter } from "@/lib/quarters";
import type { WasteRepository } from "./waste-repository";

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

async function parseJsonOrThrow(resp: Response): Promise<unknown> {
  if (resp.status === 204) return null;
  if (!resp.ok) {
    let detail = resp.statusText;
    try {
      const body = (await resp.json()) as { detail?: string };
      if (body?.detail) detail = body.detail;
    } catch {
      // swallow — fall back to statusText
    }
    throw new HttpError(resp.status, `${resp.status}: ${detail}`);
  }
  if (resp.status === 200 || resp.status === 201) return resp.json();
  return null;
}

export class BackendWasteRepository implements WasteRepository {
  constructor(
    private readonly baseUrl: string,
    private readonly locationId: string,
  ) {}

  private url(
    path: string,
    params?: Record<string, string | undefined>,
  ): string {
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    const u = new URL(this.baseUrl + path, base);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) u.searchParams.set(k, v);
      }
    }
    return u.toString();
  }

  private async request<T>(
    path: string,
    init?: RequestInit & { params?: Record<string, string | undefined> },
  ): Promise<T> {
    const { params, ...rest } = init ?? {};
    const resp = await fetch(this.url(path, params), {
      headers: {
        "Content-Type": "application/json",
      },
      ...rest,
    });
    return (await parseJsonOrThrow(resp)) as T;
  }

  async getRegistrations(): Promise<WasteRegistration[]> {
    return this.request<WasteRegistration[]>(
      `/locations/${encodeURIComponent(this.locationId)}/registrations`,
    );
  }

  async getRegistrationByDate(date: string): Promise<WasteRegistration | null> {
    const list = await this.request<WasteRegistration[]>(
      `/locations/${encodeURIComponent(this.locationId)}/registrations`,
      {
        params: { date },
      },
    );
    return list[0] ?? null;
  }

  async createRegistration(reg: WasteRegistration): Promise<void> {
    await this.request<WasteRegistration>(
      `/locations/${encodeURIComponent(this.locationId)}/registrations`,
      {
        method: "POST",
        body: JSON.stringify(reg),
      },
    );
  }

  async updateRegistration(reg: WasteRegistration): Promise<void> {
    await this.request<WasteRegistration>(
      `/locations/${encodeURIComponent(this.locationId)}/registrations/${encodeURIComponent(reg.id)}`,
      {
        method: "PUT",
        body: JSON.stringify(reg),
      },
    );
  }

  async deleteRegistration(id: string): Promise<void> {
    await this.request<null>(
      `/locations/${encodeURIComponent(this.locationId)}/registrations/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
    );
  }

  async getRegistrationsByDateRange(
    from: string,
    to: string,
  ): Promise<WasteRegistration[]> {
    return this.request<WasteRegistration[]>(
      `/locations/${encodeURIComponent(this.locationId)}/registrations`,
      {
        params: { from, to },
      },
    );
  }

  async getRegistrationsInPeriod(period: string): Promise<WasteRegistration[]> {
    if (period.includes("Q")) {
      return this.request<WasteRegistration[]>(
        `/locations/${encodeURIComponent(this.locationId)}/registrations`,
        {
          params: { period },
        },
      );
    }
    // YYYY-MM → first/last day of that month
    const [y, m] = period.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    const from = `${period}-01`;
    const to = `${period}-${String(last).padStart(2, "0")}`;
    return this.getRegistrationsByDateRange(from, to);
  }

  async getReports(): Promise<Report[]> {
    return this.request<Report[]>(
      `/locations/${encodeURIComponent(this.locationId)}/reports`,
    );
  }

  async getReportForPeriod(period: string): Promise<Report | null> {
    try {
      return await this.request<Report>(
        `/locations/${encodeURIComponent(this.locationId)}/reports/${encodeURIComponent(period)}`,
      );
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) return null;
      throw err;
    }
  }

  async submitReport(period: string, submittedBy: string): Promise<Report> {
    return this.request<Report>(
      `/locations/${encodeURIComponent(this.locationId)}/reports`,
      {
        method: "POST",
        body: JSON.stringify({ period, submittedBy }),
      },
    );
  }

  async unlockReport(period: string): Promise<void> {
    await this.request<null>(
      `/locations/${encodeURIComponent(this.locationId)}/reports/${encodeURIComponent(period)}`,
      {
        method: "DELETE",
      },
    );
  }

  async isPeriodLocked(periodOrDate: string): Promise<boolean> {
    const quarter = periodOrDate.includes("Q")
      ? periodOrDate
      : dateToQuarter(periodOrDate);
    const report = await this.getReportForPeriod(quarter);
    return report !== null;
  }

  async getReportForDate(date: string): Promise<Report | null> {
    return this.getReportForPeriod(dateToQuarter(date));
  }
}
