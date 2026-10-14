-- 003_core_tables.sql
-- Core tables: companies, branches, users, roles, permissions, memberships.
-- All use UUID primary keys and TIMESTAMPTZ timestamps.
-- Safe to run multiple times (IF NOT EXISTS on all statements).

-- ─── Companies ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(200) NOT NULL,
  registration_number VARCHAR(50),
  vat_number      VARCHAR(50),
  currency        VARCHAR(3) NOT NULL DEFAULT 'KES',
  timezone        VARCHAR(50) NOT NULL DEFAULT 'Africa/Nairobi',
  address_line1   VARCHAR(200),
  address_line2   VARCHAR(200),
  city            VARCHAR(100),
  county          VARCHAR(100),
  postal_code     VARCHAR(20),
  phone           VARCHAR(30),
  email           CITEXT,
  website         VARCHAR(200),
  settings        JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Branches ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  code            VARCHAR(20),
  address_line1   VARCHAR(200),
  address_line2   VARCHAR(200),
  city            VARCHAR(100),
  county          VARCHAR(100),
  postal_code     VARCHAR(20),
  phone           VARCHAR(30),
  email           CITEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_branches_company_id ON branches(company_id);

-- ─── Users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           CITEXT NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(100) NOT NULL,
  phone           VARCHAR(30),
  avatar_url      VARCHAR(500),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Permissions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  permission      VARCHAR(100) NOT NULL UNIQUE,
  description     VARCHAR(255),
  category        VARCHAR(50)
);

-- ─── Role-Permissions junction ───────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  role            user_role NOT NULL,
  permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_id)
);

-- ─── Company Memberships ─────────────────────────────────────
-- Associates users with companies (and optionally branches) with a role.
CREATE TABLE IF NOT EXISTS company_memberships (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  role            user_role NOT NULL DEFAULT 'staff',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON company_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_company_id ON company_memberships(company_id);
