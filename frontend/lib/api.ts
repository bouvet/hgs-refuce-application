import type { User, AdminUser, Location } from "@/lib/types";

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
  userId?: string,
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

  const { params: _, ...rest } = init ?? {};
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (userId) {
    headers["X-User-Id"] = userId;
  }

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
  login: async (username: string, password: string): Promise<AdminUser> => {
    return request<AdminUser>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  getMyLocations: async (userId: string): Promise<Location[]> => {
    return request<Location[]>("/locations", {}, userId);
  },

  createLocation: async (userId: string, name: string): Promise<Location> => {
    return request<Location>(
      "/locations",
      { method: "POST", body: JSON.stringify({ name }) },
      userId,
    );
  },

  deleteLocation: async (userId: string, locationId: string): Promise<void> => {
    await request<void>(
      `/locations/${encodeURIComponent(locationId)}`,
      { method: "DELETE" },
      userId,
    );
  },

  listAllUsers: async (userId: string): Promise<AdminUser[]> => {
    return request<AdminUser[]>("/users", {}, userId);
  },

  createUser: async (
    userId: string,
    username: string,
    isAdmin: boolean,
  ): Promise<User> => {
    return request<User>(
      "/users",
      {
        method: "POST",
        body: JSON.stringify({ id: username, isAdmin }),
      },
      userId,
    );
  },

  deleteUser: async (userId: string, targetUserId: string): Promise<void> => {
    await request<void>(
      `/users/${encodeURIComponent(targetUserId)}`,
      { method: "DELETE" },
      userId,
    );
  },

  addUserToLocation: async (
    userId: string,
    locationId: string,
    targetUserId: string,
  ): Promise<void> => {
    await request<void>(
      `/locations/${encodeURIComponent(locationId)}/users/${encodeURIComponent(targetUserId)}`,
      { method: "POST" },
      userId,
    );
  },

  removeUserFromLocation: async (
    userId: string,
    locationId: string,
    targetUserId: string,
  ): Promise<void> => {
    await request<void>(
      `/locations/${encodeURIComponent(locationId)}/users/${encodeURIComponent(targetUserId)}`,
      { method: "DELETE" },
      userId,
    );
  },

  listLocationUsers: async (
    userId: string,
    locationId: string,
  ): Promise<string[]> => {
    return request<string[]>(
      `/locations/${encodeURIComponent(locationId)}/users`,
      {},
      userId,
    );
  },
};
