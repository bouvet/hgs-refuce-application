/**
 * Better Auth server configuration.
 *
 * Owns:
 *   - Postgres connection used for `user`, `session`, `account`, `verification`
 *     tables (managed via `npx @better-auth/cli@latest migrate`).
 *   - Microsoft (Entra ID) social sign-in.
 *   - Username + PIN sign-in (custom plugin in `./auth-plugins/pin-credentials`).
 *   - Storing the stable `backendUserId` on first sign-in.
 *
 * Better Auth holds IDENTITY ONLY. Role and location are owned by the FastAPI
 * backend and fetched live from it (see `lib/server-currentUser.ts`) — never mirrored
 * onto the session, so they can't go stale.
 *
 * Read by:
 *   - `app/api/auth/[...all]/route.ts` (Next.js handler)
 *   - `lib/server-session.ts` (RSC + server action helpers)
 *   - `lib/auth-client.ts` for inferred types only — never imports runtime.
 *
 * Environment variables — see `.env.local.example`.
 */
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";
import { authEnv } from "@/lib/auth-env";
import { pinCredentials } from "@/lib/auth-plugins/pin-credentials";
import { backendServiceFetch } from "@/lib/server-api";

// The backend confirms the Entra user exists and returns its stable identity.
// `role` is returned too but intentionally NOT persisted here — the backend
// stays the source of truth and is queried for it on demand.
//
// If the user is unknown to the backend, the response carries `pending`. The
// backend queues a pending access request for a superadmin to approve, and we
// let the user finish creating a Better Auth row WITHOUT a `backendUserId`.
// They land on `/select-location`, which shows a “awaiting approval” notice.
export type SsoResolveResponse =
  | {
      status: "resolved";
      backendUserId: string;
      role: "user" | "admin" | "superadmin";
    }
  | { status: "pending" };

declare global {
  var __betterAuthPgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!globalThis.__betterAuthPgPool) {
    globalThis.__betterAuthPgPool = new Pool({
      connectionString: authEnv.databaseURL,
    });
  }
  return globalThis.__betterAuthPgPool;
}

async function resolveSsoUser(input: {
  email: string;
  name: string;
  entraOid?: string;
}): Promise<SsoResolveResponse | null> {
  try {
    const resp = await backendServiceFetch("/auth/sso-resolve", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as SsoResolveResponse;
  } catch {
    return null;
  }
}

function createAuth() {
  return betterAuth({
    appName: "Avfallsregistrering",
    baseURL: authEnv.baseURL,
    secret: authEnv.secret,
    database: getPool(),

    // Email/password is intentionally disabled — the backend owns credential
    // verification via the pin-credentials plugin.
    emailAndPassword: { enabled: false },

    socialProviders: {
      microsoft: {
        clientId: authEnv.microsoft.clientId,
        clientSecret: authEnv.microsoft.clientSecret,
        tenantId: authEnv.microsoft.tenantId,
      },
    },

    // Identity-only additional field. Role and location are NOT stored here.
    user: {
      additionalFields: {
        backendUserId: {
          type: "string",
          required: false,
          unique: true,
          input: false,
        },
      },
    },

    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            // Brand-new SSO user: ask the backend whether this email maps to a
            // provisioned user. On "resolved" we capture the stable backend id.
            // On "pending" (or transport failure) we still create the Better Auth
            // row, but without a backendUserId — the user lands on /select-location
            // which shows an "awaiting approval" notice and lazily retries the
            // resolve until a superadmin provisions them.
            const resolved = await resolveSsoUser({
              email: user.email,
              name: user.name,
            });
            if (resolved && resolved.status === "resolved") {
              return {
                data: { ...user, backendUserId: resolved.backendUserId },
              };
            }
            return { data: user };
          },
        },
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // refresh every 24h
      // Cookie cache disabled: the session carries identity only, and server-side
      // checks read it fresh from Postgres. Role/location live in the backend and
      // are fetched per request (lib/server-currentUser.ts), so there is no cached auth
      // data to go stale. proxy.ts only checks cookie presence, so it's unaffected.
      cookieCache: { enabled: false },
    },

    rateLimit: {
      enabled: true,
      window: 10,
      max: 100,
      customRules: {
        "/sign-in/pin": { window: 60, max: 5 },
      },
    },

    advanced: {
      cookiePrefix: "avfall",
      useSecureCookies: process.env.NODE_ENV === "production",
      // Azure App Service / Front Door terminate TLS in front of Next.js and
      // forward the original client IP in `x-forwarded-for`. Without this,
      // rate-limit buckets collapse to a single shared key per path.
      ipAddress: {
        ipAddressHeaders: ["x-forwarded-for"],
      },
    },

    trustedOrigins: [authEnv.baseURL],

    plugins: [pinCredentials(), nextCookies()],
  });
}

// Lazy singleton: betterAuth() is only called on the first request, not at
// module load time. This means secrets are never read during `next build` and
// only need to exist in the Azure runtime environment — not in CI.
type Auth = ReturnType<typeof createAuth>;
let _auth: Auth | undefined;

export const auth = new Proxy({} as Auth, {
  get(_target, prop: string | symbol) {
    if (!_auth) _auth = createAuth();
    return Reflect.get(_auth, prop);
  },
  has(_target, prop: string | symbol) {
    if (!_auth) _auth = createAuth();
    return Reflect.has(_auth, prop);
  },
});

export type Session = typeof auth.$Infer.Session;
export type SessionUser = typeof auth.$Infer.Session.user;
