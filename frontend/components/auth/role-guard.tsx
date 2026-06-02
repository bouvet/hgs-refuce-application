"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCurrentUser } from "@/hooks/use-current-user"
import type { UserRole } from "@/lib/types"

type RoleGuardProps = {
  role: UserRole
  children: React.ReactNode
}

export function RoleGuard({ role, children }: RoleGuardProps) {
  const router = useRouter()
  const { user } = useCurrentUser()

  useEffect(() => {
    if (user !== null && user.role !== role) {
      router.replace("/")
    }
  }, [user, role, router])

  return <>{children}</>
}
