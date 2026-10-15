-- Resource Reservation Management System: database schema
-- Running this file resets the database (development use only).

CREATE EXTENSION IF NOT EXISTS btree_gist;

DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS resources;
DROP TABLE IF EXISTS resource_types;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE resource_types (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  description  TEXT
);

CREATE TABLE resources (
  id                SERIAL PRIMARY KEY,
  resource_type_id  INTEGER NOT NULL REFERENCES resource_types (id),
  name              TEXT NOT NULL UNIQUE,
  location          TEXT,
  capacity          INTEGER CHECK (capacity IS NULL OR capacity > 0),
  description       TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reservations (
  id           SERIAL PRIMARY KEY,
  resource_id  INTEGER NOT NULL REFERENCES resources (id),
  user_id      INTEGER NOT NULL REFERENCES users (id),
  start_time   TIMESTAMPTZ NOT NULL,
  end_time     TIMESTAMPTZ NOT NULL,
  purpose      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT end_after_start CHECK (end_time > start_time),

  -- The database itself refuses two confirmed reservations for the same
  -- resource whose time ranges overlap. Back-to-back bookings are allowed
  -- because the range includes the start and excludes the end.
  CONSTRAINT no_overlapping_reservations EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status = 'confirmed')
);

CREATE INDEX reservations_resource_start_index ON reservations (resource_id, start_time);
CREATE INDEX reservations_user_index ON reservations (user_id);
