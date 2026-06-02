import { RoleSelector } from "@/components/auth/role-selector"

export default function Home() {
  return (
    <main className="flex flex-col flex-1 items-center justify-center min-h-screen bg-background px-4">
      <RoleSelector />
    </main>
  )
}
