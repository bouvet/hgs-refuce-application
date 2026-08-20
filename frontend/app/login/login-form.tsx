"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, Lock, Users } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type LoginFormProps = {
  redirectTo: string | null;
};

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<"choose" | "pin">("choose");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const callbackURL = redirectTo ?? "/";

  async function handleMicrosoft() {
    setLoading(true);
    setError("");
    try {
      await authClient.signIn.social({
        provider: "microsoft",
        callbackURL,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kunne ikke starte Microsoft-innlogging",
      );
      setLoading(false);
    }
  }

  async function handlePin() {
    if (!username.trim() || !pin.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      // Better Auth returns { data, error } (it does not throw on 4xx). On a
      // failed sign-in `error` is set — show it and stop, never navigate.
      const result = (await authClient.signIn.pin({ username, pin })) as {
        error?: { message?: string } | null;
      } | null;
      if (result?.error) {
        setError(result.error.message ?? "Feil brukernavn eller PIN");
        return;
      }
      router.replace(callbackURL);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Innlogging feilet");
    } finally {
      setLoading(false);
    }
  }

  if (step === "pin") {
    return (
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-primary text-primary-foreground mb-2">
            <Lock className="size-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Logg inn</h1>
          <p className="text-sm text-muted-foreground">Brukernavn og PIN</p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Brukernavn"
            autoComplete="username"
            className="w-full px-4 py-3 rounded-xl border border-border bg-card outline-none transition-colors focus:border-primary"
          />
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePin()}
            placeholder="PIN"
            autoComplete="current-password"
            className="w-full px-4 py-3 rounded-xl border border-border bg-card outline-none transition-colors focus:border-primary"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={handlePin}
            disabled={!username.trim() || !pin.trim() || loading}
            className="w-full h-11 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-default"
            style={{
              background:
                username.trim() && pin.trim() && !loading
                  ? "var(--primary)"
                  : "var(--muted)",
              color:
                username.trim() && pin.trim() && !loading
                  ? "white"
                  : "var(--muted-foreground)",
            }}
          >
            {loading ? "Logger inn..." : "Logg inn"}
          </button>
          <button
            onClick={() => {
              setStep("choose");
              setError("");
              setPin("");
            }}
            className="w-full h-11 rounded-xl font-semibold border border-border bg-card hover:bg-muted transition-colors"
          >
            Tilbake
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-sm">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="text-5xl font-bold mb-2">
          <span>Waste</span>
          <span className="text-primary">Flow</span>
        </div>
        <div className="flex items-center justify-center size-14 rounded-2xl bg-primary text-primary-foreground mb-2">
          <Leaf className="size-7" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Avfallsregistrering
        </h1>
        <p className="text-sm text-muted-foreground">
          Logg inn for å fortsette
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          onClick={handleMicrosoft}
          disabled={loading}
          className="flex items-center gap-4 w-full rounded-xl border border-border bg-card p-5 text-left transition-colors hover:bg-accent hover:border-accent-foreground/20 active:scale-[0.98] disabled:opacity-60"
        >
          <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary shrink-0">
            <Users className="size-6" />
          </div>
          <div>
            <div className="font-semibold">Logg inn med Microsoft</div>
            <div className="text-sm text-muted-foreground">
              Bruk din Bouvet-konto
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            setStep("pin");
            setError("");
          }}
          disabled={loading}
          className="flex items-center gap-4 w-full rounded-xl border border-border bg-card p-5 text-left transition-colors hover:bg-accent hover:border-accent-foreground/20 active:scale-[0.98] disabled:opacity-60"
        >
          <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary shrink-0">
            <Lock className="size-6" />
          </div>
          <div>
            <div className="font-semibold">Logg inn med PIN</div>
            <div className="text-sm text-muted-foreground">
              Brukernavn og PIN
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
