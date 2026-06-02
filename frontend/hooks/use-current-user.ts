"use client"

import { use } from "react"
import { UserContext } from "@/lib/user-context"

export function useCurrentUser() {
  return use(UserContext)
}
