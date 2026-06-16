"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, Users, ShieldCheck, Lock } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { UserContext } from "@/lib/user-context";
import { api } from "@/lib/api";
import type { User, Location } from "@/lib/types";

const REMEMBERED_LOCATION_KEY = "boss-app:remembered-location";

export function RoleSelector() {
  const router = useRouter();
  const { user, setUser } = useCurrentUser();
  const { locationId, setLocationId } = useContext(UserContext);
  const [step, setStep] = useState<"role" | "login" | "superadmin" | "location">("role");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.role === "common" && locationId) router.replace("/registrer");
    else if (user?.role === "admin" && locationId) router.replace("/oversikt");
    else if (user?.isSuperAdmin && locationId) router.replace("/oversikt");
  }, [user, locationId, router]);

  async function fetchLocations() {
    if (!user) return;
    try {
      setLoading(true);
      const locs = await api.getMyLocations(user.id);
      setLocations(locs);
      const remembered = localStorage.getItem(REMEMBERED_LOCATION_KEY);
      if (remembered && locs.some((l) => l.id === remembered)) {
        setSelectedLocation(remembered);
      }
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Klarte ikke å hente lokasjoner");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (step === "location" && user) {
      (async () => {
        try {
          setLoading(true);
          const locs = await api.getMyLocations(user.id);
          setLocations(locs);
          const remembered = localStorage.getItem(REMEMBERED_LOCATION_KEY);
          if (remembered && locs.some((l) => l.id === remembered)) {
            setSelectedLocation(remembered);
          }
          setError("");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Klarte ikke å hente lokasjoner");
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [step, user]);

  function selectRole(role: "common" | "admin") {
    const u: User = {
      id: role,
      name: role === "common" ? "Registrerer" : "Administrator",
      role,
    };
    setUser(u);
    setStep("location");
  }

  async function loginSuperAdmin() {
    try {
      setLoading(true);
      setError("");
      const user = await api.login(username, password);
      const u: User = {
        id: user.id,
        name: "Super-admin",
        role: "admin",
        isSuperAdmin: true,
      };
      setUser(u);
      setStep("location");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Innlogging feilet");
    } finally {
      setLoading(false);
    }
  }

  async function loginCommonUser() {
    try {
      setLoading(true);
      setError("");
      const backendUser = await api.login(username, password);
      if (backendUser.isSuperAdmin) {
        setError("Bruk super-admin innlogging for denne brukeren");
        return;
      }
      const u: User = {
        id: backendUser.id,
        name: backendUser.id,
        role: backendUser.isAdmin ? "admin" : "common",
        isSuperAdmin: false,
      };
      setUser(u);
      setStep("location");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Innlogging feilet");
    } finally {
      setLoading(false);
    }
  }

  function selectLocation() {
    if (!selectedLocation) return;
    localStorage.setItem(REMEMBERED_LOCATION_KEY, selectedLocation);
    setLocationId(selectedLocation);
    router.push(user?.isSuperAdmin ? "/oversikt" : user?.role === "common" ? "/registrer" : "/oversikt");
  }

  if (step === "login") {
    return (
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-primary text-primary-foreground mb-2">
            <Users className="size-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Logg inn
          </h1>
          <p className="text-sm text-muted-foreground">
            Brukernavn og passord
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Brukernavn"
            className="w-full px-4 py-3 rounded-xl border border-border bg-card outline-none transition-colors focus:border-primary"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && loginCommonUser()}
            placeholder="Passord"
            className="w-full px-4 py-3 rounded-xl border border-border bg-card outline-none transition-colors focus:border-primary"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={loginCommonUser}
            disabled={!username.trim() || !password.trim() || loading}
            className="w-full h-11 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-default"
            style={{
              background:
                username.trim() && password.trim() && !loading
                  ? "var(--primary)"
                  : "var(--muted)",
              color:
                username.trim() && password.trim() && !loading
                  ? "white"
                  : "var(--muted-foreground)",
            }}
          >
            {loading ? "Logger inn..." : "Logg inn"}
          </button>
          <button
            onClick={() => {
              setStep("role");
              setUsername("");
              setPassword("");
              setError("");
            }}
            className="w-full h-11 rounded-xl font-semibold border border-border bg-card hover:bg-muted transition-colors"
          >
            Tilbake
          </button>
        </div>
      </div>
    );
  }

  if (step === "superadmin") {
    return (
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-primary text-primary-foreground mb-2">
            <Lock className="size-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Super-admin innlogging
          </h1>
          <p className="text-sm text-muted-foreground">
            Logg inn med ditt brukernavn og passord
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Brukernavn"
            className="w-full px-4 py-3 rounded-xl border border-border bg-card outline-none transition-colors focus:border-primary"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && loginSuperAdmin()}
            placeholder="Passord"
            className="w-full px-4 py-3 rounded-xl border border-border bg-card outline-none transition-colors focus:border-primary"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={loginSuperAdmin}
            disabled={!username.trim() || !password.trim() || loading}
            className="w-full h-11 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-default"
            style={{
              background:
                username.trim() && password.trim() && !loading
                  ? "var(--primary)"
                  : "var(--muted)",
              color:
                username.trim() && password.trim() && !loading
                  ? "white"
                  : "var(--muted-foreground)",
            }}
          >
            {loading ? "Logger inn..." : "Logg inn"}
          </button>
          <button
            onClick={() => {
              setStep("role");
              setUsername("");
              setPassword("");
              setError("");
            }}
            className="w-full h-11 rounded-xl font-semibold border border-border bg-card hover:bg-muted transition-colors"
          >
            Tilbake
          </button>
        </div>
      </div>
    );
  }

  if (step === "location") {
    return (
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-primary text-primary-foreground mb-2">
            <Leaf className="size-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Velg lokasjon
          </h1>
          <p className="text-sm text-muted-foreground">
            Hvilken lokasjon skal du arbeide med?
          </p>
        </div>

        <div className="flex flex-col gap-4 w-full">
          {error && <p className="text-sm text-red-500">{error}</p>}

          {loading && !locations.length ? (
            <p className="text-center text-muted-foreground">Laster lokasjoner...</p>
          ) : (
            <>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card outline-none transition-colors focus:border-primary"
              >
                <option value="">Velg en lokasjon</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>

              <button
                onClick={selectLocation}
                disabled={!selectedLocation || loading}
                className="w-full h-11 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-default"
                style={{
                  background: selectedLocation && !loading ? "var(--primary)" : "var(--muted)",
                  color: selectedLocation && !loading ? "white" : "var(--muted-foreground)",
                }}
              >
                Fortsett
              </button>
            </>
          )}

          <button
            onClick={() => {
              setStep("role");
              setUser(null);
              setSelectedLocation("");
              setError("");
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
        <button
          onClick={() => setStep("login")}
          className="flex items-center gap-4 w-full rounded-xl border border-border bg-card p-5 text-left transition-colors hover:bg-accent hover:border-accent-foreground/20 active:scale-[0.98]"
        >
          <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary shrink-0">
            <Users className="size-6" />
          </div>
          <div>
            <div className="font-semibold">Logg inn som Registrerer</div>
            <div className="text-sm text-muted-foreground">
              Registrer avfall daglig
            </div>
          </div>
        </button>

        <button
          onClick={() => selectRole("admin")}
          className="flex items-center gap-4 w-full rounded-xl border border-border bg-card p-5 text-left transition-colors hover:bg-accent hover:border-accent-foreground/20 active:scale-[0.98]"
        >
          <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary shrink-0">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <div className="font-semibold">Logg inn som Administrator</div>
            <div className="text-sm text-muted-foreground">
              Oversikt, statistikk og rapportering
            </div>
          </div>
        </button>

        <button
          onClick={() => setStep("superadmin")}
          className="flex items-center gap-4 w-full rounded-xl border border-border bg-card p-5 text-left transition-colors hover:bg-accent hover:border-accent-foreground/20 active:scale-[0.98]"
        >
          <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary shrink-0">
            <Lock className="size-6" />
          </div>
          <div>
            <div className="font-semibold">Super-admin innlogging</div>
            <div className="text-sm text-muted-foreground">
              Administrer lokasjoner og brukere
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
