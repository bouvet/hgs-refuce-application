"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "@/lib/api";
import type { AdminUser, Location } from "@/lib/types";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function SuperAdminContent() {
  const { user } = useCurrentUser();
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [newUsername, setNewUsername] = useState("");
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [newLocName, setNewLocName] = useState("");
  const [selectedLocForUser, setSelectedLocForUser] = useState("");
  const [selectedUserForLoc, setSelectedUserForLoc] = useState("");
  const [locationUsers, setLocationUsers] = useState<Record<string, string[]>>(
    {},
  );
  const [expandedLoc, setExpandedLoc] = useState<string | null>(null);

  const userId = user?.id;

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
  }, [userId]);

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
    if (!newUsername.trim() || !userId) return;
    try {
      setLoadingUsers(true);
      await api.createUser(newUsername.trim(), newUserIsAdmin);
      setNewUsername("");
      setNewUserIsAdmin(false);
      setSuccess("Bruker opprettet");
      await fetchUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Klarte ikke å opprette bruker",
      );
    } finally {
      setLoadingUsers(false);
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

      <Tabs defaultValue="brukere">
        <TabsList>
          <TabsTrigger value="brukere">Brukere</TabsTrigger>
          <TabsTrigger value="lokasjoner">Lokasjoner</TabsTrigger>
        </TabsList>

        <TabsContent value="brukere" className="mt-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Brukernavn"
                className="flex-1 px-4 py-2 rounded-lg border border-border bg-card outline-none focus:border-primary"
              />
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
                disabled={!newUsername.trim() || loadingUsers}
                className="px-4 py-2 rounded-lg bg-primary text-white font-semibold disabled:opacity-50 disabled:cursor-default flex items-center gap-2"
              >
                <Plus className="size-4" />
                Opprett bruker
              </button>
            </div>

            <div className="space-y-2">
              {loadingUsers && (
                <p className="text-muted-foreground">Laster brukere...</p>
              )}
              {!loadingUsers && users.length === 0 && (
                <p className="text-muted-foreground">Ingen brukere funnet</p>
              )}
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                >
                  <span className="font-medium">{u.id}</span>
                  {u.id !== "sadmin" && (
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
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
                                {u.id}
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
      </Tabs>
    </div>
  );
}
