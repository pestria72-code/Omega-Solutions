# Salesperson Playwright tests

These browser tests use the real Omega login and POS UI.

## Local setup

1. From `vite-version/`, install the frontend dependencies with `npm ci`.
2. Install the Playwright runner and Chromium:
   ```sh
   npm install --no-save --package-lock=false @playwright/test
   npx playwright install chromium
   ```
3. Start the API against an **isolated development/test database** on `http://127.0.0.1:3000/api`, or set `E2E_API_BASE_URL` to the development API URL.
4. Run the read-only smoke test:
   ```sh
   npx playwright test
   ```

The config starts the Vite dev server on `127.0.0.1:4173`. Without credentials, the sign-in page smoke test runs and authenticated tests are skipped.

## Authenticated checks

Set `E2E_SALESPERSON_EMAIL`, `E2E_SALESPERSON_PASSWORD`, and `E2E_API_BASE_URL` to a dedicated development salesperson identity and development API. The identity should already be verified through Neon Auth, be a member of the isolated test company, and have an assigned warehouse with an open shift.

The checkout test is **disabled by default**. To enable it locally, set `E2E_ALLOW_MUTATIONS=true` and `E2E_CHECKOUT_PRODUCT` to a unique searchable name of a stocked product in that test company. It creates a real sale, so only use a disposable/isolated development company. It does not open or close shifts and must not be pointed at production.

## GitHub Actions

The `Salesperson Playwright E2E` workflow builds the frontend and runs Chromium tests on changes to `vite-version/` on `development`. Add these repository Actions secrets to enable authenticated tests:

- `E2E_SALESPERSON_EMAIL`
- `E2E_SALESPERSON_PASSWORD`
- `E2E_API_BASE_URL` (development API only)

Set repository variable `E2E_CHECKOUT_PRODUCT` only for a dedicated disposable test company. Checkout mutations remain disabled in CI unless the workflow is deliberately changed and reviewed. Playwright traces, screenshots, videos and HTML report are uploaded as an artifact when generated.

This is an initial UI workflow, not yet a complete assertion of database stock/accounting/payment invariants. Keep the existing API regression tests as a separate required check.
