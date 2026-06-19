# How This Codebase Runs Under The Hood

This document explains the project from the point of view of someone learning TypeScript, React, and Next.js. It is not
an exhaustive reference. It is a map of what runs where, why files are placed where they are, and how one button click
turns into a recorded dataspace trace.

## The Short Version

This is a Next.js application written in TypeScript.

**Default behaviour:** `MVD_MOCK_MODE=off` — wizard steps call the live MVD deployment. Mock responses are available only when you explicitly set mock mode to `on`.

- React components render the pages you see in the browser.
- Next.js App Router turns files under `src/app` into routes.
- API route files under `src/app/api` run on the server, not in the browser.
- Server helper files under `src/lib` call the MVD backend, parse responses, redact secrets, and store traces.
- Local SQLite stores traces and settings in `data/mvd-traces.sqlite`.

The app has two audiences at the same time:

- Non-technical stakeholders see guided process steps and plain-language explanations.
- Technical users can open Advanced Diagnostics to inspect endpoints, response status, payload snippets, and trace events.

## Runtime Layers

Think of the application as four layers:

```text
Browser UI
  -> Next.js API routes
    -> TypeScript helper modules
      -> MVD services and SQLite storage
```

### 1. Browser UI

These files render pages and interactive components:

- `src/app/page.tsx`
- `src/app/fiware/page.tsx`
- `src/app/use-cases/page.tsx`
- `src/components/ScenarioWizardClient.tsx`
- `src/components/ProcessVisualizationClient.tsx`
- `src/components/DeploymentStatusClient.tsx`

Some components start with:

```ts
"use client";
```

That line means the component runs in the browser and can use React state, click handlers, `localStorage`, and effects.
For example, `ScenarioWizardClient.tsx` needs browser state because it tracks the active step, progress, selected IDs,
and whether the technical log is visible.

### 2. Next.js API Routes

Files inside `src/app/api/**/route.ts` define backend endpoints for the dashboard.

Examples:

- `src/app/api/mvd/route.ts` handles scenario actions from the UI.
- `src/app/api/ready/route.ts` returns health/readiness results.
- `src/app/api/settings/route.ts` reads and saves dashboard configuration.
- `src/app/api/traces/route.ts` reads, creates, updates, and deletes traces.

These files run on the server side. That matters because they can safely access Node.js APIs, SQLite, and backend service
URLs that the browser should not call directly.

### 3. Helper Modules

The `src/lib` folder contains plain TypeScript modules. They are not pages. They are reusable logic.

- `src/lib/mvdFlow.ts`: endpoint paths, default config, request body builders, and ID extraction.
- `src/lib/mvdClient.ts`: MVD HTTP calls, IssuerService OAuth, health checks, composite offboard flow (`runOffboardParticipant`), optional mock mode, and trace recording.
- `src/lib/traceDiagnosis.ts`: offboard pass detection, effective trace status for Execution History / Advanced Diagnostics, and filtering of duplicate or stale wizard events.
- `src/lib/issuerAuth.ts`: Keycloak token for IssuerService admin API (offboarding).
- `src/lib/storage.ts`: SQLite setup and database functions.
- `src/lib/redaction.ts`: removes or masks sensitive values before storing traces.
- `src/lib/mockMvd.ts`: canned responses used only when `MVD_MOCK_MODE=on`.
- `src/lib/useCases.ts`: scenario metadata used by the UI.
- `src/lib/types.ts`: shared TypeScript types.

### 4. External Systems

The dashboard can talk to:

- Consumer control plane.
- Provider control plane.
- Consumer and provider data planes.
- Consumer and provider IdentityHub.
- Provider Vault.
- Issuer service.
- Traefik.
- Local SQLite database.

The dashboard does not create the Kubernetes cluster. It assumes the MVD services already exist and calls them.

## Route Map

In Next.js App Router, route paths come from folders.

```text
src/app/page.tsx                         -> /
src/app/fiware/page.tsx                  -> /fiware
src/app/use-cases/page.tsx               -> /use-cases
src/app/scenario-wizard/page.tsx         -> /scenario-wizard
src/app/deployment-status/page.tsx       -> /deployment-status
src/app/advanced-diagnostics/page.tsx    -> /advanced-diagnostics
src/app/settings/page.tsx                -> /settings
src/app/api/mvd/route.ts                 -> /api/mvd
src/app/api/ready/route.ts               -> /api/ready
src/app/api/settings/route.ts            -> /api/settings
src/app/api/traces/route.ts              -> /api/traces
```

A `page.tsx` file renders UI. A `route.ts` file handles HTTP requests.

## What Happens When You Open The App

1. You run `npm run dev`.
2. Next.js starts a development server.
3. You open `http://localhost:3000`.
4. Next.js renders `src/app/page.tsx` — the Core Demo home page with links into `/scenario-wizard`.
5. `src/app/page.tsx` wraps the content in `AppShell`.
6. The sidebar navigates to the scenario wizard, use cases, execution history, diagnostics, and settings.

`AppShell` is the shared layout around most pages. It provides the sidebar navigation and page container.

## What Happens When You Open The Core Demo Wizard

The primary EDC path is `/scenario-wizard?useCase=UC-CORE` (use case label **Core Demo**).

`/use-cases` lists technical validation scenarios (UC-E1 … UC-E6) and includes `ProcessVisualizationClient` for static
process diagrams. `/fiware` is a separate presentation track with no MVD backend calls.

## What Happens In The Scenario Wizard

The scenario wizard is the runnable EDC experience.

The main file is:

```text
src/components/ScenarioWizardClient.tsx
```

It tracks:

- Selected use case.
- Active step.
- Status per step: pending, running, success, failed.
- IDs extracted from MVD responses, such as `contractOfferId` and `transferProcessId`.
- Latest result.
- Whether the technical log is visible.

When you click a step button, the component calls:

```ts
fetch("/api/mvd", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "requestCatalog", ...payload }),
});
```

That `fetch` call goes from the browser to the dashboard server, not directly to MVD.

## The `/api/mvd` Action Dispatcher

`src/app/api/mvd/route.ts` receives the action.

It does this:

1. Reads the JSON body.
2. Loads config with `getConfig()`.
3. Switches on `body.action`.
4. Calls the matching helper function from `src/lib/mvdClient.ts`.
5. Returns JSON to the browser.

The route exports `maxDuration = 300` so long offboard runs are not cut off by the Next.js execution limit.

Example actions:

- `health`
- `requestCatalog`
- `startContractNegotiation`
- `getContractNegotiation`
- `startTransfer`
- `getTransfer`
- `getEdrOrDataflow`
- `fetchData`
- `terminateTransfer`
- `queryConsumerCredentials`
- `revokeConsumerCredential`
- `verifyCredentialRevoked`
- `verifyAccessRevoked`
- `offboardParticipant` — composite action; runs the full Core Demo offboard sequence server-side via `runOffboardParticipant()` in one `/api/mvd` request (terminate, poll transfer, revoke credential, verify revocation, probe data-plane denial).

This pattern is called a dispatcher. One route receives many related actions and dispatches them to specific functions.

## The MVD Client

`src/lib/mvdClient.ts` is where real service calls happen.

For example, `requestCatalog()`:

1. Builds a catalog request body using `buildCatalogRequest(config)`.
2. Calculates the management URL.
3. Calls `callMvd(...)`.
4. Extracts asset and contract offer IDs.
5. Updates the trace.
6. Returns the result to the API route.

Most actions eventually go through the shared `callMvd()` function. That function is important because it standardizes
how calls are recorded.

It records:

- Trace ID.
- Step name.
- Actor.
- Target.
- HTTP method.
- URL.
- Redacted request headers.
- Redacted request body.
- Response status.
- Redacted response body.
- Extracted IDs.
- Success or error status.
- Start and completion time.
- Duration.

## Why URLs Sometimes Change Ports

The dashboard config uses readable service base URLs such as:

```text
http://controlplane.consumer.svc.cluster.local:8080
```

That URL is good for health checks. But EDC management APIs run on a different port, usually `8081`.

So `src/lib/mvdFlow.ts` has helpers:

```ts
managementUrl(baseUrl)
dataPlaneProxyUrl(baseUrl)
```

They convert known Kubernetes service URLs:

```text
controlplane...:8080 -> controlplane...:8081
dataplane...:8080    -> dataplane...:11003
```

This keeps settings understandable while still calling the correct EDC API ports under the hood.

## The Request Builders

`src/lib/mvdFlow.ts` also builds the JSON bodies sent to EDC.

Examples:

- `buildCatalogRequest(config)`
- `buildContractRequest(config, offerId, assetId)`
- `buildTransferRequest(config, agreementId, assetId)`

These functions are useful because the UI does not need to know the exact JSON-LD structure. The UI only says "start
contract negotiation"; the helper knows how that request should look.

## ID Extraction

The MVD responses contain important IDs needed by later steps.

Examples:

- Asset ID.
- Contract offer ID.
- Contract negotiation ID.
- Contract agreement ID.
- Transfer process ID.

`extractIds()` and `extractCatalogSelection()` in `src/lib/mvdFlow.ts` look through response bodies and pull out those
values. Then the wizard stores them in React state so the next step can use them.

That is why the scenario can move from catalog to negotiation to transfer without you manually copying IDs most of the
time.

## Storage And SQLite

`src/lib/storage.ts` owns the local SQLite database.

On first use, it creates:

- `traces`
- `trace_events`
- `settings`

The database file is:

```text
data/mvd-traces.sqlite
```

Important functions:

- `createTrace()`
- `updateTrace()`
- `addTraceEvent()`
- `getTraceWithEvents()`
- `listTracesWithEvents()`
- `getConfig()`
- `saveConfig()`

Settings saved in the Settings page are stored in the `settings` table. They are not written back to `.env.local`.

## Redaction

The dashboard stores traces, but it tries not to store secrets in plain text.

`src/lib/redaction.ts` masks values such as:

- API keys.
- Authorization headers.
- Tokens.
- Secrets.
- Password-like fields.

This is why Advanced Diagnostics can show useful technical evidence without casually exposing every credential.

It is a local validation tool with access to cluster management APIs, so do not expose it publicly without authentication and a security review.

## Health Checks

Health checks run through:

- `src/app/api/ready/route.ts`
- `healthCheck()` in `src/lib/mvdClient.ts`
- `src/components/DeploymentStatusClient.tsx`

The dashboard uses three user-facing health states:

- `success`: service is reachable.
- `warning`: service is reachable, but the endpoint is not a dedicated health endpoint.
- `offline`: connection failed, timed out, DNS failed, or the response was not acceptable for that check.

Important behavior:

- HTTP `200-299` is healthy.
- IdentityHub `204 No Content` is healthy.
- Traefik `404` at `/` is warning/reachable, not offline.

The idea is to avoid scaring non-technical users when a service is reachable but `/` is not a real app route.

## TypeScript Basics Used Here

TypeScript is JavaScript with types added.

This project uses types to describe shared shapes:

```ts
export type MvdConfig = {
  consumerControlPlaneUrl: string;
  providerControlPlaneUrl: string;
  mockMode: "on" | "off";
};
```

That means TypeScript can warn you if code forgets a required field or passes the wrong value.

Another example:

```ts
export type HealthState = "success" | "warning" | "offline";
```

This is a union type. It means the value must be exactly one of those strings. If you accidentally type `"warn"` instead
of `"warning"`, the type checker catches it.

## React State Basics Used Here

Client components use React state:

```ts
const [message, setMessage] = useState<string | null>(null);
```

This means:

- `message` is the current value.
- `setMessage(...)` updates it.
- The UI re-renders when it changes.
- The type is either `string` or `null`.

The wizard uses this for active step, result messages, extracted IDs, and technical log visibility.

## Why Some Files Are Server-Only

Files that use Node.js APIs, SQLite, or backend service URLs should stay on the server.

Examples:

- `src/lib/storage.ts`
- `src/app/api/mvd/route.ts`
- `src/app/api/ready/route.ts`

Browser code cannot safely open `data/mvd-traces.sqlite`. It also should not directly own backend credentials or internal
service calls. That is why browser components call `/api/...` routes instead.

## A Full Example: Catalog Discovery

Here is the full path for the catalog step:

1. User clicks `Run Individual Step` for Catalog Discovery.
2. `ScenarioWizardClient.tsx` calls `/api/mvd` with `action: "requestCatalog"`.
3. `src/app/api/mvd/route.ts` receives the request and calls `requestCatalog(config, traceId, useCaseId)`.
4. `src/lib/mvdClient.ts` builds the catalog request.
5. `managementUrl()` converts the configured control-plane base URL to the management port.
6. `fetch()` sends the request to the consumer control plane.
7. The response is parsed.
8. Asset and offer IDs are extracted.
9. A trace event is inserted into SQLite.
10. The browser receives the result.
11. The wizard shows a plain-language success message and stores the IDs for the next step.

## A Full Example: Final Data Fetch

The final data fetch happens later:

1. Contract negotiation has produced an agreement ID.
2. Transfer has produced a transfer process ID.
3. The dashboard asks the data plane for open dataflow metadata.
4. It extracts an access token if one is present.
5. It calls the data-plane proxy data endpoint.
6. It stores the final response in the trace.
7. The UI shows that the consumer received the protected data.

## Core Demo Offboard And Trace Status

Core Demo step 5 (Offboard / Revoke Access) is special in two ways.

### One server round-trip

Most wizard steps send one action per click. Offboard used to chain many browser `fetch("/api/mvd")` calls (terminate,
poll transfer, IssuerService revoke, denial probe). That was fragile in production when a single fetch dropped.

Now the wizard sends **`action: "offboardParticipant"`** once. `runOffboardParticipant()` in `src/lib/mvdClient.ts` runs
the full sequence on the server and records each MVD step in SQLite as before. The `/api/mvd` route sets
`maxDuration = 300` so the platform allows long offboard requests.

### Production fetch recovery

In production the browser can lose the HTTP response even when the server completed offboard (Traefik/proxy timeout,
connection reset, tab navigation). Symptoms:

- Wizard message: `Could not reach the dashboard API`
- A stale WIZARD `core-offboard` row with `"selection"` in the request (older builds only — current code does not write this)
- MVD steps such as `terminateTransfer` and `getTransfer` TERMINATED **after** that row in the timeline

Recovery behaviour in `ScenarioWizardClient.tsx`:

- **`isOffboardStep()`** — treats `core-offboard` by step id, not only by action name.
- **`offboardPassInTrace(traceId, poll)`** — polls `GET /api/traces` for several seconds after a failure.
- **`callMvd("offboardParticipant")`** — on fetch error, checks the trace and returns success when MVD proof exists.
- **`recordStepFailure()`** — never records a WIZARD error for offboard; delegates to trace-based finalization.

### Expected denial = success

The final probe (`verifyAccessRevoked`) **should** return HTTP ≥403 when access was revoked. That event stays in the
trace as `status: "error"` with the real status code — it is evidence, not a failure.

`src/lib/traceDiagnosis.ts` decides what the UI shows:

- `traceHasOffboardPass(events)` — true when MVD evidence shows offboard completed (denial probe, terminate + revoke, or
  terminate + prior data access).
- `effectiveTraceStatus(status, events)` — returns `success` when offboard passed, even if the raw trace row in SQLite
  still says `error` from an old wizard fetch failure.
- `displayTraceEvents(events)` — hides stale `core-offboard` wizard errors when MVD proof exists.

Execution History, Advanced Diagnostics, and `GET /api/traces` use these helpers. Loading traces runs **`syncTraceStatus`**
so the stored SQLite status catches up when MVD evidence overrides a stale `error` value. Adding trace events via
`PUT /api/traces` triggers the same sync.

The scenario wizard marks step 5 green and shows **100% complete** when offboard pass is detected, including recovery
after a client error if MVD steps already succeeded.

## Where To Start Reading Code

If you feel lost, read in this order:

1. `src/app/page.tsx`: simplest page and routing example.
2. `src/app/use-cases/page.tsx`: page composed from reusable components.
3. `src/components/ProcessVisualizationClient.tsx`: client component with local state.
4. `src/components/ScenarioWizardClient.tsx`: main interactive scenario runner.
5. `src/app/api/mvd/route.ts`: server API dispatcher.
6. `src/lib/mvdClient.ts`: actual MVD call logic (including `runOffboardParticipant`).
7. `src/lib/mvdFlow.ts`: request builders and ID extraction.
8. `src/lib/traceDiagnosis.ts`: offboard pass rules and effective trace status.
9. `src/lib/storage.ts`: SQLite persistence.

## Common Confusions

### Why does the browser not call MVD directly?

Because the dashboard wants a single controlled backend layer that can add API keys, redact secrets, store traces, and
handle internal Kubernetes URLs.

### Why are there both pages and components?

Pages define routes. Components are reusable UI pieces that pages can compose.

### Why are there both environment variables and Settings?

Environment variables provide deployment defaults. The Settings page lets you override them at runtime and stores those
overrides in SQLite.

### Why do some pages say FIWARE but the backend calls are EDC?

The FIWARE track is currently a preparation and audit presentation track. The runnable backend integration is the EDC
MVD track.

### Why is there mock mode?

Mock mode is **off by default**. Set `MVD_MOCK_MODE=on` only when you want to click through the UI without a running MVD
cluster. With mock mode off, failed calls (for example catalog `502` when Vault secrets are missing) appear immediately in
traces — that is the intended validation behaviour.

### Why does offboard say "Could not reach the dashboard API" but MVD steps look fine?

The offboard sequence runs on the server inside one `/api/mvd` request. If the browser or ingress drops the response,
the wizard may show a client error while SQLite already contains successful MVD events. Refresh Advanced Diagnostics or
wait for trace polling — status and step 5 should recover when `traceHasOffboardPass()` is true. For repeated cases in
Kubernetes, raise the proxy read timeout in front of the dashboard.

## Useful Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
```

Use `npm run typecheck` when you want TypeScript to explain what shapes do not line up. Use `npm run lint` when you want
style and React-pattern checks.

## Mental Model

The simplest way to remember this project:

```text
Pages show the experience.
Client components handle clicks and local UI state.
API routes receive browser requests.
Library functions call MVD and SQLite.
Types keep the data shapes honest.
Trace diagnosis interprets MVD evidence for status and UI.
Traces preserve what happened.
Advanced Diagnostics shows the technical truth.
```

