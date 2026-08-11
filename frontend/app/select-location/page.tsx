export const dynamic = "force-dynamic";

import { Leaf } from "lucide-react";
import { requireSession, getBackendUserId } from "@/lib/server-session";
import {
  getCurrentUser,
  resolveAndPersistBackendUserId,
} from "@/lib/server-currentUser";
import { LocationPicker } from "./location-picker";
import { LogoutLink } from "./logout-link";

function CenteredNotice({
  title,
  body,
  withIcon = false,
  withLogoutLink = false,
}: {
  title: string;
  body: string;
  withIcon?: boolean;
  withLogoutLink?: boolean;
}) {
  return (
    <main className="flex flex-col flex-1 items-center justify-center min-h-screen bg-background px-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        {withIcon && (
          <div className="flex items-center justify-center size-14 rounded-2xl bg-primary text-primary-foreground">
            <Leaf className="size-7" />
          </div>
        )}
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{body}</p>
        {withLogoutLink && <LogoutLink />}
      </div>
    </main>
  );
}

export default async function SelectLocationPage() {
  const session = await requireSession("/select-location");
  let backendUserId = getBackendUserId(session.user);

  if (!backendUserId) {
    // SSO user whose first sign-in happened before they were provisioned in
    // the backend. The Better Auth create-hook only fires once, so retry the
    // resolve here — if a superadmin has since approved them, this writes the
    // backendUserId onto their BA row and the rest of the page works normally.
    backendUserId = await resolveAndPersistBackendUserId({
      baUserId: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
    });
  }

  if (!backendUserId) {
    return (
      <CenteredNotice
        withIcon
        withLogoutLink
        title="Venter på godkjenning"
        body="Din forespørsel om tilgang er sendt. En administrator må godkjenne deg før du kan logge inn. Prøv å oppdatere siden om litt."
      />
    );
  }

  // Role + locations + preferred location all come from the backend.
  const currentUser = await getCurrentUser(backendUserId);

  if (!currentUser) {
    return (
      <CenteredNotice
        withIcon
        withLogoutLink
        title="Bruker ikke klargjort"
        body="Klarte ikke å hente brukeren din fra backend. Prøv igjen senere eller kontakt en administrator."
      />
    );
  }

  if (currentUser.locations.length === 0) {
    return (
      <CenteredNotice
        withIcon
        withLogoutLink
        title="Ingen lokasjoner"
        body="Du er ikke knyttet til noen lokasjon ennå. Kontakt en administrator."
      />
    );
  }

  // Pre-select the preferred location if set, otherwise fall back to the first.
  const defaultLocationId =
    currentUser.preferredLocationId ?? currentUser.locations[0].id;

  return (
    <main className="flex flex-col flex-1 items-center justify-center min-h-screen bg-background px-4">
      <LocationPicker
        locations={currentUser.locations}
        defaultLocationId={defaultLocationId}
      />
    </main>
  );
}
