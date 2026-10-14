-- 001_extensions.sql
-- Enable required PostgreSQL extensions.
-- Safe to run multiple times (IF NOT EXISTS on all statements).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";
