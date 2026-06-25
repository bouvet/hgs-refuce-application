/**
 * Server-only HTTP client for talking to the FastAPI backend.
 *
 * Two flavours:
 *
 * - `backendFetch(path, { actAs })` — calls an endpoint on behalf of a
 *   signed-in user. Adds `X-User-Id` and a fresh HMAC `X-User-Sig` header so
 *   the backend can verify the request really came from this Next.js server.
 * - `backendServiceFetch(path)` — server-to-server call signed with the
 *   shared secret only (no user impersonation). Used by Better Auth hooks
 *   to look up roles and resolve SSO users.
 *
 * NEVER import this module from a client component — the shared secret must
 * stay on the server. The `node:crypto` import will fail on the client bundle,
 * which provides an implicit safeguard.
 */
import crypto from "node:crypto";
import { authEnv } from "@/lib/auth-env";

const SIGNATURE_VERSION = "v1";

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function buildUserHeaders(userId: string): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${SIGNATURE_VERSION}.${timestamp}.${userId}`;
  return {
    "X-User-Id": userId,
    "X-User-Sig-Timestamp": timestamp,
    "X-User-Sig-Version": SIGNATURE_VERSION,
    "X-User-Sig": sign(payload, authEnv.backendSharedSecret),
  };
}

function buildServiceHeaders(): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${SIGNATURE_VERSION}.${timestamp}.service`;
  return {
    "X-Service-Sig-Timestamp": timestamp,
    "X-Service-Sig-Version": SIGNATURE_VERSION,
    "X-Service-Sig": sign(payload, authEnv.backendSharedSecret),
  };
}

function buildUrl(path: string): string {
  const base = authEnv.backendURL.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

export type BackendFetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
  actAs: string;
};

export async function backendFetch(
  path: string,
  options: BackendFetchOptions,
): Promise<Response> {
  const { actAs, headers, ...rest } = options;
  return fetch(buildUrl(path), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...buildUserHeaders(actAs),
    },
  });
}

export async function backendServiceFetch(
  path: string,
  options: Omit<RequestInit, "headers"> & {
    headers?: Record<string, string>;
  } = {},
): Promise<Response> {
  const { headers, ...rest } = options;
  return fetch(buildUrl(path), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...buildServiceHeaders(),
    },
  });
}

/** Forward identity headers from an active server-side request. */
export function userIdentityHeaders(userId: string): Record<string, string> {
  return buildUserHeaders(userId);
}
