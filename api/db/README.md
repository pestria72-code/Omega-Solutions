# Company management foundation

This migration adds the ERP company profile table in the `public` schema. It deliberately keeps Neon Auth's managed `neon_auth` tables unchanged.

## Data model

- `companies.id`: stable UUID for the ERP company profile.
- `companies.organization_id`: one-to-one link to `neon_auth.organization`; deleting an auth organization cascades to its ERP profile.
- `kra_pin`: optional unique KRA PIN. Validate it server-side before accepting it.
- `currency`: defaults to KES.
- `timezone`: defaults to Africa/Nairobi.
- `status`: active or inactive.

## Apply safely

Review `migrations/0001_create_companies.sql` before applying it to the production branch. Prefer a Neon development branch first. The migration is additive and does not delete or alter existing tables.

## Follow-up work

1. Define authenticated company onboarding and organization creation.
2. Add a NestJS companies module with DTO validation and authorization.
3. Ensure every company-scoped query derives organization membership from the authenticated session; never trust a client-supplied organization ID alone.
4. Add integration tests and a reviewed deployment migration workflow.
