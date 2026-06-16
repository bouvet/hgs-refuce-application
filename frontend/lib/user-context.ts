"use client"

import { createContext } from "react"
import type { User } from "@/lib/types"

export type UserContextValue = {
  user: User | null
  setUser: (user: User | null) => void
  setUserWithToken: (user: User, token: string) => void
  locationId: string | null
  setLocationId: (locationId: string | null) => void
}

export const UserContext = createContext<UserContextValue>({
  user: null,
  setUser: () => {},
  setUserWithToken: () => {},
  locationId: null,
  setLocationId: () => {},
})
