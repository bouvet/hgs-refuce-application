"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCurrentUser } from "@/hooks/use-current-user"

type SuperAdminGuardProps = {
  children: React.ReactNode
}

export function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const router = useRouter()
  const { user } = useCurrentUser()

  useEffect(() => {
    if (user !== null && !user.isSuperAdmin) {
      router.replace("/")
    }
  }, [user, router])

  return <>{children}</>
}
