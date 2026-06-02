"use client"

import { useSyncExternalStore } from "react"
import { UserContext } from "@/lib/user-context"
import type { User } from "@/lib/types"

const USER_KEY = "boss-app:current-user"
const LOCATION_KEY = "boss-app:current-location"

const localListeners = new Set<() => void>()

function subscribe(callback: () => void): () => void {
  localListeners.add(callback)
  window.addEventListener("storage", callback)
  return () => {
    localListeners.delete(callback)
    window.removeEventListener("storage", callback)
  }
}

let cachedRaw: string | null | undefined = undefined
let cachedUser: User | null = null
let cachedLocationRaw: string | null | undefined = undefined
let cachedLocationId: string | null = null

function getSnapshot(): User | null {
  const raw = window.localStorage.getItem(USER_KEY)
  if (raw === cachedRaw) return cachedUser

  cachedRaw = raw
  if (!raw) {
    cachedUser = null
    return null
  }

  const stored = JSON.parse(raw) as User
  if (stored.name === "Kantinemedarbeider") {
    const migrated = { ...stored, name: "Registrerer" }
    window.localStorage.setItem(USER_KEY, JSON.stringify(migrated))
    cachedUser = migrated
  } else {
    cachedUser = stored
  }

  return cachedUser
}

function getLocationSnapshot(): string | null {
  const raw = window.localStorage.getItem(LOCATION_KEY)
  if (raw === cachedLocationRaw) return cachedLocationId

  cachedLocationRaw = raw
  cachedLocationId = raw ?? null

  return cachedLocationId
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const user = useSyncExternalStore(subscribe, getSnapshot, () => null)
  const locationId = useSyncExternalStore(subscribe, getLocationSnapshot, () => null)

  function setUser(u: User | null) {
    if (u) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(u))
    } else {
      window.localStorage.removeItem(USER_KEY)
    }
    localListeners.forEach(listener => listener())
  }

  function setLocationId(id: string | null) {
    if (id) {
      window.localStorage.setItem(LOCATION_KEY, id)
    } else {
      window.localStorage.removeItem(LOCATION_KEY)
    }
    localListeners.forEach(listener => listener())
  }

  return (
    <UserContext value={{ user, setUser, locationId, setLocationId }}>
      {children}
    </UserContext>
  )
}
