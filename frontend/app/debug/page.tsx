import Link from "next/link";

/**
 * The localStorage-based "debug auto-login as sadmin" flow is gone.
 * With Better Auth, sessions can only be created through real sign-in
 * (Microsoft SSO or PIN credentials). Use a seeded backend account
 * during local development instead.
 */
export default function DebugPage() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-background px-4">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-xl font-semibold">Debug-modus er fjernet</h1>
        <p className="text-sm text-muted-foreground">
          Autentisering går nå via Better Auth. Logg inn på vanlig måte fra
          forsiden — bruk en seedet backend-konto for lokal utvikling.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm text-primary underline"
        >
          Gå til innlogging
        </Link>
      </div>
    </main>
  );
}
