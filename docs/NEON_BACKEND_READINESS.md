# Omega Solutions — Neon Backend Readiness Review

Status: preparation only. No production migration, secret change, or deployment was performed.

## Verified target

- Neon project: Omega Solutions
- Project ID: ancient-lake-38155666
- Branch: production (primary/default)
- Database: neondb
- Current schema inspection: no application tables returned.
- Do not use Supabase connection details for this deployment. The target selected for Omega is Neon.

## Migration files reviewed

- `api/src/migrations/001_extensions.sql`: enables `uuid-ossp` and `citext`.
- `api/src/migrations/002_enums.sql`: defines the application enums, including `user_role`.
- `api/src/migrations/003_core_tables.sql`: creates companies, branches, users, permissions, role_permissions, and company_memberships.
- `api/src/migrations/004_audit_logs.sql`: creates the audit log table and indexes.
- `api/src/migrations/005_seed_permissions.sql`: seeds permission definitions and role-permission mappings only; it does not create demo companies, users, customers, invoices, or other business records.

### Required corrections before applying migrations

1. Migration 003 does not enable row-level security despite earlier reporting that all tables have RLS enabled. Do not rely on RLS until explicit policies are designed and verified. The application currently enforces tenant access through membership checks; that is not equivalent to database RLS.
2. Review and test the migration sequence against a disposable Neon branch first. Verify extension permissions, schema objects, migration history, and rollback expectations before applying anything to production.
3. Do not execute `npm run migrate` against production until the migration diff and target connection have been explicitly verified.

## Application blockers found in source

- Registration inserts a user but does not create a company or company membership.
- The existing company creation endpoint requires an existing owner/admin membership, so it cannot bootstrap a first company for a newly registered user.
- The frontend login page contains a "Continue without signing in" link; verify protected-route behavior and remove any path that bypasses authentication.
- The frontend requires `VITE_API_BASE_URL` to be set to the eventual API origin plus `/api`. The production origin is not yet known because no backend service has been deployed.
- The existing `.github/workflows/deploy.yml` deploys a ShadcnStore static template and is not an Omega backend deployment workflow.

## Hosting preparation

`render.yaml` prepares a separate Node.js web service with:
- working directory `api`
- `npm ci && npm run build` build command
- `npm run start:prod` start command
- `/api/health` health check
- secret environment variables entered in the host dashboard, never committed to Git

Auto-deploy is disabled in the blueprint. Creating the hosted service, entering secrets, deploying, and running migrations remain deliberate follow-up steps.

## Verification still required

1. Apply migrations to a disposable Neon branch and confirm the schema and `pgmigrations` history.
2. Fix first-company onboarding with a transaction that creates the company and owner membership atomically.
3. Verify registration, login, `GET /api/auth/me`, company onboarding, company/branch access isolation, and `GET /api/health` against the disposable database.
4. Run CI build/lint/unit tests on the PR.
5. After review and explicit approval, create/configure the Render service and set the frontend's `VITE_API_BASE_URL` to the deployed API URL.
6. Only then schedule production migrations and deployment.

No credentials or demo business records belong in this repository.
