/**
 * Centralised access to authentication-related environment variables.
 *
 * Reads are evaluated lazily so that test setups can mutate `process.env`
 * before `auth` is initialised. Each helper throws when a required value
 * is missing rather than silently using an insecure default — this matches
 * Better Auth's own "fail loud in production" posture.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `See .env.local.example for the full list.`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

export const authEnv = {
  get baseURL(): string {
    return optional("BETTER_AUTH_URL", "http://localhost:3000");
  },
  get secret(): string {
    return required("BETTER_AUTH_SECRET");
  },
  get databaseURL(): string {
    return required("DATABASE_URL");
  },
  get backendURL(): string {
    return optional(
      "BACKEND_API_URL",
      optional("NEXT_PUBLIC_API_URL", "http://localhost:8000"),
    );
  },
  get backendSharedSecret(): string {
    return required("BACKEND_SHARED_SECRET");
  },
  get microsoft(): {
    clientId: string;
    clientSecret: string;
    tenantId: string;
  } {
    return {
      clientId: required("MICROSOFT_CLIENT_ID"),
      clientSecret: required("MICROSOFT_CLIENT_SECRET"),
      // Pin to the Bouvet tenant. "common" would let ANY Microsoft work,
      // school, or personal account complete the OAuth flow.
      tenantId: required("MICROSOFT_TENANT_ID"),
    };
  },
};
