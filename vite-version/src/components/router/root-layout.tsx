import { Link, isRouteErrorResponse, Outlet, useNavigation, useRouteError } from "react-router-dom"

import { LoadingSpinner } from "@/components/ui/loading-spinner"

/** Thin top bar shown while the next route's code is loading. */
function RouteProgress() {
  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className="route-progress fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/15"
    >
      <div className="route-progress-bar h-full w-1/3 bg-primary" />
    </div>
  )
}

/** Friendly route-level recovery UI instead of React Router's developer error screen. */
export function RootErrorBoundary() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? error.statusText || `Request failed (${error.status})`
    : error instanceof Error
      ? error.message
      : "An unexpected error occurred."

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-lg space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <p className="text-sm font-medium text-destructive">Page could not be displayed</p>
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          This page ran into a problem. You can try again or return to the dashboard.
        </p>
        {import.meta.env.DEV && (
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{message}</pre>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <Link
            to="/dashboard"
            className="inline-flex min-h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium"
          >
            Go to dashboard
          </Link>
        </div>
      </section>
    </main>
  )
}

export function RootLayout() {
  const navigation = useNavigation()
  return (
    <>
      {navigation.state === "loading" && <RouteProgress />}
      <Outlet />
    </>
  )
}

/** Shown on the very first load, before any route has rendered. */
export function RootFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <LoadingSpinner />
    </div>
  )
}
