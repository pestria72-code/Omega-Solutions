# Omega Solutions — Backend API

NestJS backend for the Omega ERP SaaS platform. Uses Neon Serverless PostgreSQL.

## Prerequisites

- Node.js 20.19+ (see root `.nvmrc`)
- A Neon PostgreSQL project (create one at https://neon.tech)

## Environment Setup

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Replace each placeholder with your real values:

   | Variable | Where to get it |
   |---|---|
   | `DATABASE_URL` | Neon Console → your project → Connection Details → copy the connection string. It looks like `postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require` |
   | `JWT_SECRET` | Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `JWT_REFRESH_SECRET` | Generate a second, different hex string the same way |
   | `CORS_ORIGIN` | Your frontend URL (e.g. `https://your-app.vercel.app`); use `http://localhost:5173` for local dev |

3. Never commit `.env` — it is already in `.gitignore`.

## Running Migrations

Migrations create the database tables and reference data. Run them once your `DATABASE_URL` is configured:

```bash
npm run migrate
```

This executes all `.sql` files in `src/migrations/` in order, tracking which have been applied in a `pgmigrations` table.

To check migration status:
```bash
npm run migrate:status
```

To create a new migration:
```bash
npm run migrate:create -- --name describe_the_change
```

## Starting the Server

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000/api`.

## Testing the Database Connection

Once your `.env` has a real `DATABASE_URL`:

```bash
# 1. Run migrations
npm run migrate

# 2. Start the server
npm run start:dev

# 3. In another terminal, test the health endpoint
curl http://localhost:3000/api/health
```

A successful response looks like:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-10-14T..."
}
```

If you get `"database": "disconnected"`, check that your `DATABASE_URL` is correct and includes `?sslmode=require`.

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api` | No | Health check (returns "Hello World!") |
| GET | `/api/health` | No | Database connection status |
| POST | `/api/auth/register` | No | Create a new user account |
| POST | `/api/auth/login` | No | Login with email/password, returns JWT tokens |
| POST | `/api/auth/refresh` | No | Exchange refresh token for new token pair |
| GET | `/api/auth/me` | Yes | Get current user profile and permissions |

## Where to Configure Real Variables in Production

When you deploy the backend to a hosting provider (Render, Railway, Fly.io, etc.):

1. **Render**: Dashboard → your service → Environment → add each variable (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `PORT`)
2. **Railway**: Project → your service → Variables tab → add each variable
3. **Fly.io**: `fly secrets set DATABASE_URL=... JWT_SECRET=... JWT_REFRESH_SECRET=... CORS_ORIGIN=...`
4. **Any VPS or Docker**: Pass via `--env-file .env` or set as container environment variables

The Neon `DATABASE_URL` should come from the Neon Console connection string. Never hardcode it in source files.

## Project Structure

```
src/
  main.ts                  # App bootstrap (CORS, validation, prefix)
  app.module.ts            # Root module
  app.controller.ts        # Root + health endpoints
  app.service.ts           # Hello World service
  database.service.ts      # PostgreSQL pool, query, transaction helpers
  database/
    database.module.ts     # Global database module
  common/
    common.module.ts       # Global filters module
    filters/
      all-exceptions.filter.ts
  audit/
    audit.service.ts       # Append-only audit logging
    audit.module.ts
  auth/
    auth.module.ts         # JWT + Passport module
    auth.controller.ts     # Register, login, refresh, me
    auth.service.ts        # Password hashing, token issuance
    dto/auth.dto.ts        # Request validation DTOs
    strategies/jwt.strategy.ts
    guards/jwt-auth.guard.ts
    interfaces/authenticated-user.ts
  rbac/
    rbac.module.ts
    permissions.ts         # Permission type definitions
    decorators/require-permissions.decorator.ts
    guards/permissions.guard.ts
  migrations/
    001_extensions.sql     # uuid-ossp, citext
    002_enums.sql          # Payment methods, document types, statuses, roles
    003_core_tables.sql    # companies, branches, users, permissions, memberships
    004_audit_logs.sql     # Append-only audit trail
migrate.config.ts          # node-pg-migrate configuration
```
