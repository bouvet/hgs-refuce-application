-- Initialize data-db for hgs-refuce backend application
-- This script creates the schema and seeds demo data for local development

-- Create users table (note: preferred_location_id is added by backend migration)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    is_admin INTEGER NOT NULL DEFAULT 0,
    is_super_admin INTEGER NOT NULL DEFAULT 0,
    password TEXT,
    created_at TEXT NOT NULL
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Create location_users association table
CREATE TABLE IF NOT EXISTS location_users (
    location_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (location_id, user_id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create registrations table
CREATE TABLE IF NOT EXISTS registrations (
    id TEXT PRIMARY KEY,
    location_id TEXT NOT NULL,
    date TEXT NOT NULL,
    entries TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Create index on registrations
CREATE INDEX IF NOT EXISTS idx_registrations_location_date
ON registrations(location_id, date);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
    period TEXT NOT NULL,
    location_id TEXT NOT NULL,
    id TEXT NOT NULL,
    submitted_at TEXT NOT NULL,
    submitted_by TEXT NOT NULL,
    PRIMARY KEY (period, location_id),
    FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Seed demo users (for local development/testing)
-- Note: Passwords are stored in plaintext for development purposes.
-- In production, use the backend's authentication system.

INSERT INTO users (id, is_admin, is_super_admin, password, created_at)
VALUES
    ('sadmin', 1, 1, 'sadmin', '2026-01-01T00:00:00'),
    ('admin', 1, 0, 'admin', '2026-01-01T00:00:00'),
    ('common', 0, 0, 'common', '2026-01-01T00:00:00'),
    ('user1', 0, 0, '234', '2026-01-01T00:00:00'),
    ('haugesundUser', 0, 0, '123', '2026-01-01T00:00:00'),
    ('stavangerUser', 0, 0, '123', '2026-01-01T00:00:00')
ON CONFLICT DO NOTHING;

-- Seed demo locations
INSERT INTO locations (id, name, created_at)
VALUES
    ('loc-bouvet', 'Bouvet Office', '2026-01-01T00:00:00'),
    ('loc-haugesund', 'Haugesund', '2026-01-01T00:00:00'),
    ('loc-stavanger', 'Stavanger', '2026-01-01T00:00:00')
ON CONFLICT DO NOTHING;

-- Associate users with locations
INSERT INTO location_users (location_id, user_id)
VALUES
    ('loc-bouvet', 'sadmin'),
    ('loc-bouvet', 'admin'),
    ('loc-bouvet', 'common'),
    ('loc-bouvet', 'user1'),
    ('loc-haugesund', 'haugesundUser'),
    ('loc-stavanger', 'stavangerUser')
ON CONFLICT DO NOTHING;
