/**
 * Client-side companion to the `pinCredentials` server plugin.
 * Adds typed `authClient.signIn.pin({ username, pin })` to the React client.
 */
import type { BetterAuthClientPlugin } from "better-auth/client";
import type { pinCredentials } from "@/lib/auth-plugins/pin-credentials";

export const pinCredentialsClient = (): BetterAuthClientPlugin => ({
  id: "pin-credentials",
  $InferServerPlugin: {} as ReturnType<typeof pinCredentials>,
});
