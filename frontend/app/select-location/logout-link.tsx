"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function LogoutLink() {
  const router = useRouter();

  async function handleLogout() {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.replace("/login");
          router.refresh();
        },
      },
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
    >
      Tilbake til innlogging
    </button>
  );
}
