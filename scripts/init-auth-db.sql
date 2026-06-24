-- Initialize auth-db for Better Auth
-- Better Auth will create its own tables on first connection.
-- This script is a reference for the expected database structure.
-- In development, you can leave this empty and let the application initialize.

-- Better Auth expects these tables to be created automatically.
-- See: https://www.better-auth.com/docs/database

-- Example test users (optional - mainly for reference)
-- In practice, users are created via Better Auth's API or the application's SSO flow

-- Note: Better Auth manages user creation and authentication.
-- For local development without SSO, use the application's PIN login
-- at the frontend (username/PIN credentials in lib/auth-plugins/pin-credentials.ts)
