import { test, expect } from "@playwright/test";

const email = process.env.E2E_SALESPERSON_EMAIL;
const password = process.env.E2E_SALESPERSON_PASSWORD;
const apiBase = process.env.E2E_API_BASE_URL;
const allowMutations = process.env.E2E_ALLOW_MUTATIONS === "true";
const productSearch = process.env.E2E_CHECKOUT_PRODUCT;

test.describe("Omega salesperson POS", () => {
  test("renders the sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("signs in and confirms salesperson assignment and POS access", async ({ page }) => {
    test.skip(!email || !password || !apiBase, "Set E2E_SALESPERSON_EMAIL, E2E_SALESPERSON_PASSWORD, and E2E_API_BASE_URL for authenticated tests.");
    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/(dashboard|sales-dashboard)(\?|$)/, { timeout: 30_000 });
    await page.goto("/sales-dashboard");
    await expect(page.getByRole("heading", { name: "Sales Dashboard" })).toBeVisible();
    await expect(page.getByText("Your selling workspace")).toBeVisible();
    await expect(page.getByRole("link", { name: /open point of sale/i })).toBeVisible();

    await page.goto("/pos");
    await expect(page.getByRole("heading", { name: "Point of Sale" })).toBeVisible();
    await expect(page.getByText("Stock warehouse")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Product catalogue" })).toBeVisible();
  });

  test("completes a real cash checkout only when explicitly enabled for development", async ({ page }) => {
    test.skip(!email || !password || !apiBase, "Set salesperson credentials and E2E_API_BASE_URL.");
    test.skip(!allowMutations, "Read-only by default. Set E2E_ALLOW_MUTATIONS=true only for an isolated development test company.");
    test.skip(!productSearch, "Set E2E_CHECKOUT_PRODUCT to a known, in-stock product name in the isolated development company.");

    const target = new URL(process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173");
    const apiTarget = new URL(apiBase!);
    if (target.hostname !== "localhost" && target.hostname !== "127.0.0.1" && !target.hostname.includes("development")) {
      throw new Error("Refusing to create a sale outside localhost or a development preview URL.");
    }
    if (apiTarget.hostname === "omega-solutions-api.onrender.com") {
      throw new Error("Refusing to create a sale against the known live Omega API. Use an isolated development API.");
    }

    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/(dashboard|sales-dashboard)(\?|$)/, { timeout: 30_000 });
    await page.goto("/pos");

    // Checkout uses an already-open shift; this test never opens or closes a shift.
    await expect(page.getByRole("heading", { name: "Product catalogue" })).toBeVisible();
    await expect(page.getByText("Cashier shift", { exact: true })).toBeVisible();
    await expect(page.getByText("Open", { exact: true }).first()).toBeVisible({ timeout: 10_000 });

    const search = page.getByPlaceholder("Search or scan SKU…");
    await search.fill(productSearch!);
    const escapedSearch = productSearch!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const product = page.getByRole("button", { name: new RegExp(escapedSearch, "i") }).first();
    await expect(product).toBeVisible();
    await product.click();

    const checkout = page.getByRole("button", { name: "Complete checkout" });
    await expect(checkout).toBeEnabled();
    await checkout.click();

    await expect(page.getByRole("status")).toContainText(/recorded successfully/i, { timeout: 30_000 });
    await expect(page.getByText(/Sale [A-Z0-9-]+/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /download receipt/i })).toBeVisible();
  });
});
