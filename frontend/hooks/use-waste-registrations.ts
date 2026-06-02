"use client"

import { useContext, useState, useCallback, useEffect } from "react"
import type { WasteRegistration } from "@/lib/types"
import { createWasteRepository } from "@/lib/data/waste-repository"
import { UserContext } from "@/lib/user-context"

export function useWasteRegistrations() {
  const { user, locationId } = useContext(UserContext)
  const [registrations, setRegistrations] = useState<WasteRegistration[]>([])

  useEffect(() => {
    if (!user?.id || !locationId) return
    const repo = createWasteRepository(locationId, user.id)
    repo.getRegistrations().then(setRegistrations)
  }, [user, locationId])

  const refresh = useCallback(async () => {
    if (!user?.id || !locationId) return
    const repo = createWasteRepository(locationId, user.id)
    setRegistrations(await repo.getRegistrations())
  }, [user, locationId])

  const saveRegistration = useCallback(
    async (reg: WasteRegistration) => {
      if (!user?.id || !locationId) return
      const repo = createWasteRepository(locationId, user.id)
      await repo.saveRegistration(reg)
      await refresh()
    },
    [refresh, user, locationId]
  )

  const deleteRegistration = useCallback(
    async (id: string) => {
      if (!user?.id || !locationId) return
      const repo = createWasteRepository(locationId, user.id)
      await repo.deleteRegistration(id)
      await refresh()
    },
    [refresh, user, locationId]
  )

  return { registrations, saveRegistration, deleteRegistration, refresh }
}
