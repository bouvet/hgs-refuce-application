/**
 * Custom Better Auth plugin: username + PIN sign-in that delegates
 * credential verification to the existing FastAPI backend.
 *
 * Why a custom plugin instead of `emailAndPassword`?
 * - The legacy backend already owns the password store; rewriting auth
 *   server-side is out of scope for this refactor.
 * - This plugin keeps Better Auth as the *session authority* (cookies,
 *   rate limiting, CSRF) while letting FastAPI stay the *credential
 *   authority*. The two responsibilities are cleanly separated.
 *
 * Flow (POST /api/auth/sign-in/pin):
 *   1. Read { username, pin } from body.
 *   2. POST to FastAPI `/auth/login` (signed service-to-service).
 *   3. On 200: upsert a Better Auth user keyed on `backendUserId` (identity
 *      only — role/location are NOT stored; they're fetched live from /me).
 *   4. Create a Better Auth session and set the session cookie.
 *   5. Return the session payload to the client.
 *
 * On any 4xx/5xx from the backend the plugin throws a generic 401 "invalid
 * credentials" error — never leaks whether the username exists.
 */
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import type { BetterAuthPlugin } from "better-auth";
import { z } from "zod";
import { backendServiceFetch } from "@/lib/server-api";

const pinSignInSchema = z.object({
  username: z.string().min(1).max(128),
  pin: z.string().min(1).max(128),
});

// We only consume the backend user's stable id. Role and location are NOT
// read here — the backend stays the source of truth (queried via /currentUser).
type BackendLoginResponse = {
  id: string;
  email?: string;
  name?: string;
};

function syntheticEmail(username: string): string {
  return `${username.trim().toLowerCase()}@pin.local`;
}

export const pinCredentials = (): BetterAuthPlugin => ({
  id: "pin-credentials",
  schema: {
    user: {
      fields: {
        backendUserId: {
          type: "string",
          required: false,
          unique: true,
          input: false,
        },
      },
    },
  },
  endpoints: {
    signInPin: createAuthEndpoint(
      "/sign-in/pin",
      {
        method: "POST",
        body: pinSignInSchema,
      },
      async (ctx) => {
        const { username, pin } = ctx.body;

        const backendResp = await backendServiceFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify({ username, password: pin }),
        });

        if (!backendResp.ok) {
          throw new APIError("UNAUTHORIZED", {
            message: "Invalid username or PIN",
          });
        }

        const payload = (await backendResp.json()) as BackendLoginResponse;
        const email = payload.email ?? syntheticEmail(username);
        const name = payload.name ?? username;
        const adapter = ctx.context.internalAdapter;

        let user;
        try {
          user =
            (await adapter.findUserByEmail(email))?.user ??
            (await adapter.findUserByEmail(syntheticEmail(username)))?.user;

          if (!user) {
            user = await adapter.createUser({
              email,
              name,
              emailVerified: true,
              backendUserId: payload.id,
            });
          } else if (
            (user as Record<string, unknown>).backendUserId !== payload.id
          ) {
            user = await adapter.updateUser(user.id, {
              backendUserId: payload.id,
            });
          }
        } catch {
          // e.g. backendUserId unique-constraint collision — stay generic.
          throw new APIError("UNAUTHORIZED", {
            message: "Invalid username or PIN",
          });
        }

        const session = await adapter.createSession(user.id);

        if (!session) {
          throw new APIError("INTERNAL_SERVER_ERROR", {
            message: "Could not create session",
          });
        }

        await setSessionCookie(ctx, { session, user });

        return ctx.json({
          token: session.token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        });
      },
    ),
  },
});
