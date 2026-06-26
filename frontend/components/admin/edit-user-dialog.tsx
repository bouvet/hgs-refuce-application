"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { api } from "@/lib/api";
import type { AdminUser, UpdateUserPayload } from "@/lib/types";

/**
 * Modal for editing a single user's profile and role flags.
 *
 * Authorisation rules are mirrored from the backend (`PUT /users/{id}`):
 *   - Anyone with admin rights may edit `name`.
 *   - Only superadmins may toggle `isAdmin` or `isSuperAdmin`.
 *   - You may never edit your own role flags (prevents self-lockout); the
 *     backend's last-superadmin guard catches the cross-user equivalent and
 *     returns 409 — surfaced inline.
 *
 * The id / e-post is intentionally read-only: renaming a user would have to
 * cascade across `location_users`, `registrations.created_by`,
 * `reports.submitted_by`, and the BA `"user"."backendUserId"` column.
 * Workaround for that case: delete + recreate.
 */
export function EditUserDialog({
  user,
  callerIsSuperAdmin,
  callerId,
  onClose,
  onSaved,
}: {
  user: AdminUser;
  callerIsSuperAdmin: boolean;
  callerId: string;
  onClose: () => void;
  onSaved: (updated: AdminUser) => void;
}) {
  const [name, setName] = useState(user.name ?? "");
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [isSuperAdmin, setIsSuperAdmin] = useState(user.isSuperAdmin);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isSelf = user.id === callerId;
  const canEditRoles = callerIsSuperAdmin && !isSelf;

  async function save() {
    setError("");
    const trimmedName = name.trim();
    const patch: UpdateUserPayload = {};
    const nextName = trimmedName.length > 0 ? trimmedName : null;
    if (nextName !== user.name) patch.name = nextName;
    if (canEditRoles) {
      if (isAdmin !== user.isAdmin) patch.isAdmin = isAdmin;
      if (isSuperAdmin !== user.isSuperAdmin) patch.isSuperAdmin = isSuperAdmin;
    }

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    try {
      setSaving(true);
      const updated = await api.updateUser(user.id, patch);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Klarte ikke å lagre endringer",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-110 max-w-[95vw] bg-card border border-border rounded-2xl p-6 shadow-2xl">
        <div className="text-[18px] font-bold text-foreground mb-1.5">
          Endre bruker
        </div>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          Rediger navn og roller. E-post/brukernavn kan ikke endres.
        </p>

        <div className="space-y-3 mb-4">
          <label className="block">
            <span className="text-sm font-semibold block mb-1">
              E-post/Brukernavn
            </span>
            <input
              type="text"
              value={user.id}
              readOnly
              className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-muted-foreground outline-none cursor-not-allowed"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold block mb-1">Navn</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fullt navn"
              className="w-full px-3 py-2 rounded-lg border border-border bg-card outline-none focus:border-primary"
            />
          </label>

          {callerIsSuperAdmin && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card cursor-pointer hover:bg-accent has-[:disabled]:opacity-60 has-[:disabled]:cursor-not-allowed">
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={(e) => setIsAdmin(e.target.checked)}
                  disabled={!canEditRoles}
                />
                <span className="text-sm">Admin</span>
              </label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card cursor-pointer hover:bg-accent has-[:disabled]:opacity-60 has-[:disabled]:cursor-not-allowed">
                <input
                  type="checkbox"
                  checked={isSuperAdmin}
                  onChange={(e) => setIsSuperAdmin(e.target.checked)}
                  disabled={!canEditRoles}
                />
                <span className="text-sm">Superadmin</span>
              </label>
              {isSelf && (
                <p className="text-xs text-muted-foreground">
                  Du kan ikke endre dine egne roller.
                </p>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2.5 justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Avbryt
          </button>
          <button
            onClick={save}
            disabled={saving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary transition-opacity ${
              saving ? "opacity-60" : ""
            }`}
          >
            {saving ? (
              "Lagrer..."
            ) : (
              <>
                <Save className="size-3.5" /> Lagre
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
