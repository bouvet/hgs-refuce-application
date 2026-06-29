"use client";

import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "@/lib/api";
import type { AdminUser, Location, PendingAccessRequest } from "@/lib/types";
import { Plus, Trash2, ChevronDown, Check, X, Pencil } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EditUserDialog } from "@/components/admin/edit-user-dialog";

type UserFormMode = "sso" | "pin";

export function SuperAdminContent() {
  const { user } = useCurrentUser();
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create-user form: two distinct modes share a single "isAdmin" toggle but
  // otherwise own their own input state so flipping mode never leaks values
  // from one shape into the other.
  const [userMode, setUserMode] = useState<UserFormMode>("sso");
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [newSsoFirstName, setNewSsoFirstName] = useState("");
  const [newSsoLastName, setNewSsoLastName] = useState("");
  const [newSsoEmail, setNewSsoEmail] = useState("");
  const [newPinUsername, setNewPinUsername] = useState("");
  const [newPinPassword, setNewPinPassword] = useState("");
  // When approving a pending access request we pre-fill the SSO form and lock
  // the email field so the admin can't accidentally rename them.
  const [emailLocked, setEmailLocked] = useState(false);

  const [newLocName, setNewLocName] = useState("");
  const [selectedLocForUser, setSelectedLocForUser] = useState("");
  const [selectedUserForLoc, setSelectedUserForLoc] = useState("");
  const [locationUsers, setLocationUsers] = useState<Record<string, string[]>>(
    {},
  );
  const [expandedLoc, setExpandedLoc] = useState<string | null>(null);

  const [accessRequests, setAccessRequests] = useState<PendingAccessRequest[]>(
    [],
  );
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("brukere");
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const userId = user?.id;

  const fetchAccessRequests = useCallback(async () => {
    if (!userId) return;
    try {
      setLoadingRequests(true);
      const list = await api.listAccessRequests();
      setAccessRequests(list);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Klarte ikke å hente tilgangsforespørsler",
      );
    } finally {
      setLoadingRequests(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        setLoadingLocations(true);
        const locs = await api.getMyLocations();
        setLocations(locs);
        setError("");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Klarte ikke å hente lokasjoner",
        );
      } finally {
        setLoadingLocations(false);
      }
    })();
    (async () => {
      try {
        setLoadingUsers(true);
        const userList = await api.listAllUsers();
        setUsers(userList);
        setError("");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Klarte ikke å hente brukere",
        );
      } finally {
        setLoadingUsers(false);
      }
    })();
    fetchAccessRequests();
  }, [userId, fetchAccessRequests]);

  async function fetchLocations() {
    if (!userId) return;
    try {
      setLoadingLocations(true);
      const locs = await api.getMyLocations();
      setLocations(locs);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Klarte ikke å hente lokasjoner",
      );
    } finally {
      setLoadingLocations(false);
    }
  }

  async function fetchUsers() {
    if (!userId) return;
    try {
      setLoadingUsers(true);
      const userList = await api.listAllUsers();
      setUsers(userList);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Klarte ikke å hente brukere",
      );
    } finally {
      setLoadingUsers(false);
    }
  }

  async function fetchLocationUsers(locationId: string) {
    if (!userId) return;
    try {
      const locUsers = await api.listLocationUsers(locationId);
      setLocationUsers((prev) => ({ ...prev, [locationId]: locUsers }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Klarte ikke å hente brukere",
      );
    }
  }

  async function createUser() {
    if (!userId) return;
    setError("");

    // Build the payload from the active mode and validate client-side. The
    // backend re-validates (and is the authority) but we want to give a fast
    // friendly error instead of round-tripping a 422.
    if (userMode === "sso") {
      const email = newSsoEmail.trim().toLowerCase();
      const firstName = newSsoFirstName.trim();
      const lastName = newSsoLastName.trim();
      if (!email) {
        setError("E-postadresse er p\u00e5krevd.");
        return;
      }
      if (!email.includes("@")) {
        setError("E-postadressen m\u00e5 inneholde '@'.");
        return;
      }
      const name = `${firstName} ${lastName}`.trim() || undefined;
      try {
        setLoadingUsers(true);
        await api.createUser({ id: email, isAdmin: newUserIsAdmin, name });
        setNewSsoFirstName("");
        setNewSsoLastName("");
        setNewSsoEmail("");
        setNewUserIsAdmin(false);
        setEmailLocked(false);
        setSuccess("SSO-bruker opprettet");
        await Promise.all([fetchUsers(), fetchAccessRequests()]);
        setTimeout(() => setSuccess(""), 3000);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Klarte ikke \u00e5 opprette bruker",
        );
      } finally {
        setLoadingUsers(false);
      }
      return;
    }

    const username = newPinUsername.trim();
    const password = newPinPassword;
    if (!username) {
      setError("Brukernavn er p\u00e5krevd.");
      return;
    }
    if (username.includes("@")) {
      setError("PIN-brukernavn kan ikke inneholde '@'.");
      return;
    }
    if (password.length < 4) {
      setError("PIN m\u00e5 v\u00e6re minst 4 tegn.");
      return;
    }
    try {
      setLoadingUsers(true);
      await api.createUser({
        id: username,
        isAdmin: newUserIsAdmin,
        password,
      });
      setNewPinUsername("");
      setNewPinPassword("");
      setNewUserIsAdmin(false);
      setSuccess("PIN-bruker opprettet");
      await fetchUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Klarte ikke \u00e5 opprette bruker",
      );
    } finally {
      setLoadingUsers(false);
    }
  }

  function approveAccessRequest(req: PendingAccessRequest) {
    // Switch into SSO mode, prefill from the request, lock the email field,
    // and bounce to the Brukere tab. The actual creation is the same code path
    // as any SSO user; on success the matching pending row is cleared backend-
    // side and we refetch the access-request list.
    setUserMode("sso");
    setNewSsoEmail(req.email);
    if (req.name) {
      const parts = req.name.trim().split(/\s+/);
      setNewSsoFirstName(parts[0] ?? "");
      setNewSsoLastName(parts.slice(1).join(" "));
    } else {
      setNewSsoFirstName("");
      setNewSsoLastName("");
    }
    setNewUserIsAdmin(false);
    setEmailLocked(true);
    setActiveTab("brukere");
  }

  async function dismissAccessRequest(email: string) {
    if (!userId) return;
    if (!confirm(`Avvis tilgangsforesp\u00f8rsel fra ${email}?`)) return;
    try {
      await api.dismissAccessRequest(email);
      setSuccess("Foresp\u00f8rsel avvist");
      await fetchAccessRequests();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Klarte ikke \u00e5 avvise foresp\u00f8rsel",
      );
    }
  }

  async function deleteUser(targetUserId: string): Promise<void> {
    if (!userId || !confirm(`Slett bruker ${targetUserId}?`)) return;
    try {
      await api.deleteUser(targetUserId);
      setSuccess(`Bruker ${targetUserId} slettet`);
      await fetchUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Klarte ikke å slette bruker",
      );
    }
  }

  async function createLocation() {
    if (!newLocName.trim() || !userId) return;
    try {
      setLoadingLocations(true);
      await api.createLocation(newLocName.trim());
      setNewLocName("");
      setSuccess("Lokasjon opprettet");
      await fetchLocations();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Klarte ikke å opprette lokasjon",
      );
    } finally {
      setLoadingLocations(false);
    }
  }

  async function deleteLocation(locationId: string) {
    if (!userId || !confirm(`Slett lokasjon ${locationId}?`)) return;
    try {
      await api.deleteLocation(locationId);
      setSuccess(`Lokasjon ${locationId} slettet`);
      await fetchLocations();
      setLocationUsers((prev) => {
        const newUsers = { ...prev };
        delete newUsers[locationId];
        return newUsers;
      });
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Klarte ikke å slette lokasjon",
      );
    }
  }

  async function addUserToLocation() {
    if (!selectedLocForUser || !selectedUserForLoc || !userId) return;
    try {
      await api.addUserToLocation(selectedLocForUser, selectedUserForLoc);
      setSelectedUserForLoc("");
      setSuccess(`Bruker lagt til i lokasjon`);
      await fetchLocationUsers(selectedLocForUser);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Klarte ikke å legge til bruker",
      );
    }
  }

  async function removeUserFromLocation(
    locationId: string,
    targetUserId: string,
  ) {
    if (!userId) return;
    try {
      await api.removeUserFromLocation(locationId, targetUserId);
      setSuccess(`Bruker fjernet fra lokasjon`);
      await fetchLocationUsers(locationId);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Klarte ikke å fjerne bruker",
      );
    }
  }

  function toggleLocationExpand(locationId: string) {
    if (expandedLoc === locationId) {
      setExpandedLoc(null);
    } else {
      setExpandedLoc(locationId);
      fetchLocationUsers(locationId);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Administrasjon</h1>
        <p className="text-muted-foreground">
          Administrer brukere og lokasjoner
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-sm">
          {success}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="brukere">Brukere</TabsTrigger>
          <TabsTrigger value="lokasjoner">Lokasjoner</TabsTrigger>
          <TabsTrigger value="forespoersler">
            Tilgangsforespørsler
            {accessRequests.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5 min-w-[1.25rem]">
                {accessRequests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brukere" className="mt-6">
          <div className="space-y-4">
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => {
                  setUserMode("sso");
                  setEmailLocked(false);
                  setError("");
                }}
                className={`px-3 py-1.5 rounded-lg border transition-colors ${
                  userMode === "sso"
                    ? "bg-primary text-white border-primary"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                SSO-bruker (Microsoft)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserMode("pin");
                  setEmailLocked(false);
                  setError("");
                }}
                className={`px-3 py-1.5 rounded-lg border transition-colors ${
                  userMode === "pin"
                    ? "bg-primary text-white border-primary"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                PIN-bruker
              </button>
            </div>

            {userMode === "sso" ? (
              <div className="space-y-2 p-4 rounded-lg border border-border bg-card/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newSsoFirstName}
                    onChange={(e) => setNewSsoFirstName(e.target.value)}
                    placeholder="Fornavn"
                    className="px-4 py-2 rounded-lg border border-border bg-card outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    value={newSsoLastName}
                    onChange={(e) => setNewSsoLastName(e.target.value)}
                    placeholder="Etternavn"
                    className="px-4 py-2 rounded-lg border border-border bg-card outline-none focus:border-primary"
                  />
                </div>
                <input
                  type="email"
                  value={newSsoEmail}
                  onChange={(e) => setNewSsoEmail(e.target.value)}
                  placeholder="E-postadresse (f.eks. bruker@bouvet.no)"
                  disabled={emailLocked}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-card outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card cursor-pointer hover:bg-accent">
                    <input
                      type="checkbox"
                      checked={newUserIsAdmin}
                      onChange={(e) => setNewUserIsAdmin(e.target.checked)}
                    />
                    <span className="text-sm">Admin</span>
                  </label>
                  <button
                    onClick={createUser}
                    disabled={!newSsoEmail.trim() || loadingUsers}
                    className="px-4 py-2 rounded-lg bg-primary text-white font-semibold disabled:opacity-50 disabled:cursor-default flex items-center gap-2"
                  >
                    <Plus className="size-4" />
                    Opprett SSO-bruker
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 p-4 rounded-lg border border-border bg-card/50">
                <input
                  type="text"
                  value={newPinUsername}
                  onChange={(e) => setNewPinUsername(e.target.value)}
                  placeholder="Brukernavn (uten '@')"
                  className="w-full px-4 py-2 rounded-lg border border-border bg-card outline-none focus:border-primary"
                />
                <input
                  type="text"
                  value={newPinPassword}
                  onChange={(e) => setNewPinPassword(e.target.value)}
                  placeholder="Initial PIN (minst 4 tegn)"
                  className="w-full px-4 py-2 rounded-lg border border-border bg-card outline-none focus:border-primary"
                />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card cursor-pointer hover:bg-accent">
                    <input
                      type="checkbox"
                      checked={newUserIsAdmin}
                      onChange={(e) => setNewUserIsAdmin(e.target.checked)}
                    />
                    <span className="text-sm">Admin</span>
                  </label>
                  <button
                    onClick={createUser}
                    disabled={
                      !newPinUsername.trim() ||
                      newPinPassword.length < 4 ||
                      loadingUsers
                    }
                    className="px-4 py-2 rounded-lg bg-primary text-white font-semibold disabled:opacity-50 disabled:cursor-default flex items-center gap-2"
                  >
                    <Plus className="size-4" />
                    Opprett PIN-bruker
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {loadingUsers && (
                <p className="text-muted-foreground">Laster brukere...</p>
              )}
              {!loadingUsers && users.length === 0 && (
                <p className="text-muted-foreground">Ingen brukere funnet</p>
              )}
              {users.map((u) => {
                const roleLabel = u.isSuperAdmin
                  ? "Superadmin"
                  : u.isAdmin
                    ? "Admin"
                    : "Bruker";
                const roleClass = u.isSuperAdmin
                  ? "bg-red-500/10 text-red-600 border-red-500/20"
                  : u.isAdmin
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-muted text-muted-foreground border-border";
                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {u.name || u.id}
                      </div>
                      {u.name && (
                        <div className="text-sm text-muted-foreground truncate">
                          {u.id}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-xs font-medium ${roleClass}`}
                      >
                        {roleLabel}
                      </span>
                      <button
                        onClick={() => setEditingUser(u)}
                        className="p-2 hover:bg-accent rounded-lg transition-colors"
                        title="Endre"
                      >
                        <Pencil className="size-4" />
                      </button>
                      {u.id !== "sadmin" && (
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Slett"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="lokasjoner" className="mt-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newLocName}
                onChange={(e) => setNewLocName(e.target.value)}
                placeholder="Lokasjonsnavn"
                className="flex-1 px-4 py-2 rounded-lg border border-border bg-card outline-none focus:border-primary"
              />
              <button
                onClick={createLocation}
                disabled={!newLocName.trim() || loadingLocations}
                className="px-4 py-2 rounded-lg bg-primary text-white font-semibold disabled:opacity-50 disabled:cursor-default flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="size-4" />
                Opprett lokasjon
              </button>
            </div>

            <div className="space-y-2">
              {loadingLocations && (
                <p className="text-muted-foreground">Laster lokasjoner...</p>
              )}
              {!loadingLocations && locations.length === 0 && (
                <p className="text-muted-foreground">Ingen lokasjoner funnet</p>
              )}
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="rounded-lg border border-border bg-card"
                >
                  <div className="flex items-center justify-between p-3">
                    <div>
                      <div className="font-medium">{loc.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {loc.id}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleLocationExpand(loc.id)}
                        className="p-2 hover:bg-accent rounded-lg transition-colors"
                      >
                        <ChevronDown
                          className={`size-4 transition-transform ${
                            expandedLoc === loc.id ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => deleteLocation(loc.id)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  {expandedLoc === loc.id && (
                    <div className="border-t border-border p-3 space-y-3">
                      <div>
                        <label className="text-sm font-semibold block mb-2">
                          Legg til bruker i lokasjon
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={selectedUserForLoc}
                            onChange={(e) =>
                              setSelectedUserForLoc(e.target.value)
                            }
                            className="flex-1 px-3 py-2 rounded-lg border border-border bg-card outline-none focus:border-primary text-sm"
                          >
                            <option value="">Velg bruker</option>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name ? `${u.name} (${u.id})` : u.id}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              setSelectedLocForUser(loc.id);
                              setTimeout(addUserToLocation, 0);
                            }}
                            disabled={!selectedUserForLoc}
                            className="px-3 py-2 rounded-lg bg-primary text-white font-semibold disabled:opacity-50 disabled:cursor-default text-sm whitespace-nowrap"
                          >
                            Legg til
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-semibold block mb-2">
                          Brukere i denne lokasjonen
                        </label>
                        <div className="space-y-1 bg-background/50 rounded-lg p-2">
                          {!locationUsers[loc.id] ||
                          locationUsers[loc.id].length === 0 ? (
                            <p className="text-sm text-muted-foreground p-2">
                              Ingen brukere
                            </p>
                          ) : (
                            locationUsers[loc.id].map((u) => (
                              <div
                                key={u}
                                className="flex items-center justify-between p-2 text-sm"
                              >
                                <span>{u}</span>
                                <button
                                  onClick={() =>
                                    removeUserFromLocation(loc.id, u)
                                  }
                                  className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="forespoersler" className="mt-6">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              SSO-pålogginger fra ukjente e-postadresser havner her. Godkjenn
              for å opprette en backend-bruker, eller avvis for å fjerne
              forespørselen.
            </p>

            {loadingRequests && (
              <p className="text-muted-foreground">Laster forespørsler…</p>
            )}
            {!loadingRequests && accessRequests.length === 0 && (
              <p className="text-muted-foreground">
                Ingen ventende forespørsler
              </p>
            )}

            {accessRequests.map((req) => (
              <div
                key={req.email}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{req.email}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {req.name ?? "Ukjent navn"} · sist forsøk{" "}
                    {new Date(req.lastAttemptAt).toLocaleString("nb-NO")}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => approveAccessRequest(req)}
                    className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold flex items-center gap-1.5 hover:opacity-90"
                  >
                    <Check className="size-4" />
                    Godkjenn
                  </button>
                  <button
                    onClick={() => dismissAccessRequest(req.email)}
                    className="px-3 py-1.5 rounded-lg border border-border text-sm flex items-center gap-1.5 hover:bg-accent"
                  >
                    <X className="size-4" />
                    Avvis
                  </button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          callerIsSuperAdmin={user?.role === "superadmin"}
          callerId={userId ?? ""}
          onClose={() => setEditingUser(null)}
          onSaved={(updated) => {
            setUsers((prev) =>
              prev.map((u) => (u.id === updated.id ? updated : u)),
            );
            setSuccess(`Bruker ${updated.name || updated.id} oppdatert`);
            setTimeout(() => setSuccess(""), 3000);
          }}
        />
      )}
    </div>
  );
}
