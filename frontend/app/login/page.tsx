import { redirect } from "next/navigation";
import { getServerSession, getBackendUserId } from "@/lib/server-session";
import { getCurrentUser, type Role } from "@/lib/server-currentUser";
import { sanitizeRedirect } from "@/lib/safe-redirect";
import { LoginForm } from "./login-form";

type SearchParams = { redirect?: string | string[] };

function defaultDestinationFor(role: Role): string {
  return role === "user" ? "/registrer" : "/oversikt";
}

export default async function LoginPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const search = await props.searchParams;
  // Only same-origin relative paths survive — guards against open redirects.
  const requested = sanitizeRedirect(search.redirect);
  const session = await getServerSession();

  if (session) {
    const currentUser = await getCurrentUser(getBackendUserId(session.user));
    if (!currentUser?.preferredLocationId) {
      redirect("/select-location");
    }
    redirect(requested ?? defaultDestinationFor(currentUser.role));
  }

  return (
    <main className="flex flex-col flex-1 items-center justify-center min-h-screen bg-background px-4">
      <LoginForm redirectTo={requested} />
    </main>
  );
}
