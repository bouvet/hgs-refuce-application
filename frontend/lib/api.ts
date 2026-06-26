import type {
  AdminUser,
  CreateUserPayload,
  Location,
  PendingAccessRequest,
} from "@/lib/types";

/**
 * Browser-side API client. All requests go through the Next.js proxy at
 * `/api/[...path]`, which injects the user identity from the Better Auth
 * session — no auth headers are set here.
 *
 * No `userId` parameter is accepted: the proxy is the sole authority on
 * who the request belongs to. This prevents impersonation from the
 * client.
 */
const apiBaseUrl = "/api";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  init?: RequestInit & { params?: Record<string, string | undefined> },
): Promise<T> {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";
  const url = new URL(apiBaseUrl + path, origin);
  if (init?.params) {
    for (const [k, v] of Object.entries(init.params)) {
      if (v !== undefined) url.searchParams.set(k, v);
    }
  }

  const rest: RequestInit = { ...(init ?? {}) };
  delete (rest as { params?: unknown }).params;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const resp = await fetch(url.toString(), {
    headers,
    ...rest,
  });

  if (!resp.ok) {
    let detail = resp.statusText;
    try {
      const body = (await resp.json()) as { detail?: string };
      if (body?.detail) detail = body.detail;
    } catch {
      // swallow — fall back to statusText
    }
    throw new ApiError(resp.status, `${resp.status}: ${detail}`);
  }

  if (resp.status === 204) return null as T;
  return resp.json() as Promise<T>;
}

export const api = {
  getMyLocations: async (): Promise<Location[]> => {
    return request<Location[]>("/locations");
  },

  createLocation: async (name: string): Promise<Location> => {
    return request<Location>("/locations", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  deleteLocation: async (locationId: string): Promise<void> => {
    await request<void>(`/locations/${encodeURIComponent(locationId)}`, {
      method: "DELETE",
    });
  },

  listAllUsers: async (): Promise<AdminUser[]> => {
    return request<AdminUser[]>("/users");
  },

  createUser: async (payload: CreateUserPayload): Promise<AdminUser> => {
    return request<AdminUser>("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  deleteUser: async (targetUserId: string): Promise<void> => {
    await request<void>(`/users/${encodeURIComponent(targetUserId)}`, {
      method: "DELETE",
    });
  },

  addUserToLocation: async (
    locationId: string,
    targetUserId: string,
  ): Promise<void> => {
    await request<void>(
      `/locations/${encodeURIComponent(locationId)}/users/${encodeURIComponent(targetUserId)}`,
      { method: "POST" },
    );
  },

  removeUserFromLocation: async (
    locationId: string,
    targetUserId: string,
  ): Promise<void> => {
    await request<void>(
      `/locations/${encodeURIComponent(locationId)}/users/${encodeURIComponent(targetUserId)}`,
      { method: "DELETE" },
    );
  },

  listLocationUsers: async (locationId: string): Promise<string[]> => {
    return request<string[]>(
      `/locations/${encodeURIComponent(locationId)}/users`,
    );
  },

  listAccessRequests: async (): Promise<PendingAccessRequest[]> => {
    return request<PendingAccessRequest[]>("/admin/access-requests");
  },

  dismissAccessRequest: async (email: string): Promise<void> => {
    await request<void>(`/admin/access-requests/${encodeURIComponent(email)}`, {
      method: "DELETE",
    });
  },
};
