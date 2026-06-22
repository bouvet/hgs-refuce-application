import { redirect } from "next/navigation";
import { Leaf } from "lucide-react";
import { requireSession, getBackendUserId } from "@/lib/server-session";
import { getCurrentUser } from "@/lib/server-currentUser";
import { LocationPicker } from "./location-picker";
import { setCurrentLocation } from "./actions";

function CenteredNotice({
  title,
  body,
  withIcon = false,
}: {
  title: string;
  body: string;
  withIcon?: boolean;
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
      </div>
    </main>
  );
}

export default async function SelectLocationPage() {
  const session = await requireSession("/select-location");
  const backendUserId = getBackendUserId(session.user);

  if (!backendUserId) {
    return (
      <CenteredNotice
        title="Bruker ikke klargjort"
        body="Brukeren din er ikke knyttet til en backend-konto. Kontakt en administrator for å bli lagt til."
      />
    );
  }

  // Role + locations + preferred location all come from the backend.
  const currentUser = await getCurrentUser(backendUserId);

  if (!currentUser) {
    return (
      <CenteredNotice
        title="Bruker ikke klargjort"
        body="Klarte ikke å hente brukeren din fra backend. Prøv igjen senere eller kontakt en administrator."
      />
    );
  }

  // Already chosen — bounce them back to the app.
  if (currentUser.preferredLocationId) {
    redirect("/oversikt");
  }

  if (currentUser.locations.length === 0) {
    return (
      <CenteredNotice
        withIcon
        title="Ingen lokasjoner"
        body="Du er ikke knyttet til noen lokasjon ennå. Kontakt en administrator."
      />
    );
  }

  if (currentUser.locations.length === 1) {
    await setCurrentLocation(currentUser.locations[0].id);
    redirect("/oversikt");
  }

  return (
    <main className="flex flex-col flex-1 items-center justify-center min-h-screen bg-background px-4">
      <LocationPicker
        locations={currentUser.locations}
        defaultLocationId={currentUser.locations[0].id}
      />
    </main>
  );
}
