#!/usr/bin/env node
/**
 * Initialize Better Auth database tables
 * Run this once to set up the auth-db PostgreSQL database for Better Auth
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.AUTH_DB_HOST || 'auth-db',
  port: process.env.AUTH_DB_PORT || 5432,
  user: process.env.AUTH_DB_USER || 'postgres',
  password: process.env.AUTH_DB_PASSWORD || 'dev',
  database: process.env.AUTH_DB_NAME || 'refuce_auth',
});

const schema = `
-- Better Auth Tables
CREATE TABLE IF NOT EXISTS "user" (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    "emailVerified" BOOLEAN DEFAULT FALSE,
    image TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "backendUserId" TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    "expiresAt" TIMESTAMP NOT NULL,
    token TEXT UNIQUE,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refreshToken" TEXT,
    "accessToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP,
    "refreshTokenExpiresAt" TIMESTAMP,
    scope TEXT,
    password TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE,
    UNIQUE ("provider", "providerAccountId")
);

CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_email ON "user"("email");
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session("userId");
CREATE INDEX IF NOT EXISTS idx_session_token ON session(token);
CREATE INDEX IF NOT EXISTS idx_account_user_id ON account("userId");
CREATE INDEX IF NOT EXISTS idx_account_provider ON account(provider, "providerAccountId");
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);
`;

async function initialize() {
  try {
    console.log('Initializing Better Auth database...');
    await pool.query(schema);
    console.log('✓ Better Auth tables created successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to initialize database:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initialize();
