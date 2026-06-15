# Dataspace Use-Case Validation Platform

Educational Next.js dashboard for explaining and validating dataspace scenarios across two tracks:

- FIWARE Data Space: preparation and audit presentation track.
- Eclipse Dataspace Components (EDC): available runnable track for the Minimum Viable Dataspace (MVD) demo.

The dashboard is intentionally a demo/playground tool. It does not deploy or modify the MVD backend. It calls existing
MVD services, explains each business step in stakeholder-friendly language, and preserves technical traces for deeper
review.

For a beginner-friendly walkthrough of how the TypeScript and Next.js code fits together, read
`docs/guides/how-this-codebase-runs.md`.

## What You See In The App

The root page `/` is only a platform choice screen:

- `FIWARE Data Space` opens the preparation track.
- `Eclipse Dataspace Components` opens the EDC scenario and use-case dashboard.

The EDC path focuses on the business process first:

1. Onboard participant.
2. Create / publish data offer.
3. Request data access.
4. Access & use data.
5. Offboard / revoke access.

Each stage explains what the user sees, what the system does, who is responsible, success criteria, DSSC mapping, and
optional technical details. Users can also add custom process cards locally in the browser.

## How It Works

This project uses the Next.js App Router. Pages live in `src/app`, reusable UI lives in `src/components`, and backend
helper logic lives in `src/lib`.

Important files:

- `src/app/page.tsx`: root platform choice page.
- `src/app/fiware/page.tsx`: FIWARE preparation and audit page.
- `src/app/use-cases/page.tsx`: EDC use-case overview with process visualization.
- `src/components/ScenarioWizardClient.tsx`: guided EDC scenario runner.
- `src/components/ProcessVisualizationClient.tsx`: stakeholder process view and local custom process cards.
- `src/components/DeploymentStatusClient.tsx`: service reachability dashboard.
- `src/app/api/mvd/route.ts`: API route used by the browser to run MVD actions.
- `src/app/api/ready/route.ts`: readiness and health endpoint for the dashboard.
- `src/lib/mvdClient.ts`: performs outbound MVD calls and records trace events.
- `src/lib/mvdFlow.ts`: stores endpoint paths, default config, request payload builders, and ID extraction.
- `src/lib/storage.ts`: creates and reads the local SQLite database.
- `src/lib/redaction.ts`: masks API keys, authorization headers, tokens, secrets, and password-like values.

The normal EDC execution flow is:

1. Open the Scenario Wizard from Use Cases and run a guided use-case scenario.
2. Each wizard step calls `/api/mvd` with an action such as `requestCatalog`.
3. `src/app/api/mvd/route.ts` loads config from `src/lib/storage.ts`.
4. `src/lib/mvdClient.ts` builds and sends the real MVD HTTP request.
5. The response is parsed, redacted, and stored as a trace event in `data/mvd-traces.sqlite`.
6. Advanced Diagnostics shows the timeline, sequence view, and a single root-cause summary when a step fails.

Manual step controls remain available on the legacy EDC dashboard views for ad-hoc API experiments.

## MVD Endpoint Mapping

The configured base URLs use Kubernetes service DNS names by default. The dashboard converts user-facing health URLs to
the correct internal management and proxy ports for actual EDC calls where needed.

- Catalog: `POST {CONSUMER_CP_MANAGEMENT}/api/mgmt/v4/catalog/request`
- Start negotiation: `POST {CONSUMER_CP_MANAGEMENT}/api/mgmt/v4/contractnegotiations`
- Poll negotiation: `GET {CONSUMER_CP_MANAGEMENT}/api/mgmt/v4/contractnegotiations/{id}`
- Start transfer: `POST {CONSUMER_CP_MANAGEMENT}/api/mgmt/v4/transferprocesses`
- Poll transfer: `GET {CONSUMER_CP_MANAGEMENT}/api/mgmt/v4/transferprocesses/{id}/state`
- Open dataflow/EDR: `GET {CONSUMER_DP_PROXY}/api/proxy/flows/{id}`
- EDR fallback (MVD 0.17+): `GET {CONSUMER_CP_MANAGEMENT}/api/mgmt/v3/edrs/{id}/dataaddress`
- Fetch data: `GET {CONSUMER_DP_PROXY}/api/proxy/flows/{id}/data`

The HTTP management route version is `/api/mgmt/v4`. The JSON-LD context in request bodies can still be
`https://w3id.org/edc/connector/management/v2`; that context is not the same thing as the HTTP route version.

## Run Locally

Install dependencies and start the dashboard:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For mock-only UI exploration, set `MVD_MOCK_MODE=on`. To call a real MVD deployment, copy environment defaults and adjust
them if needed:

```bash
cp .env.example .env.local
```

## Run With MVD

Deploy and seed the MVD Kubernetes demo first. The dashboard defaults are intended for an in-cluster/EduCloud style
deployment using service DNS names such as:

- `http://controlplane.consumer.svc.cluster.local:8080`
- `http://dataplane.consumer.svc.cluster.local:8080`
- `http://identityhub.provider.svc.cluster.local:7083`
- `http://traefik.traefik.svc.cluster.local:80`

For local browser access through Traefik, keep a port-forward running when your setup depends on `*.localhost` routes:

```bash
kubectl port-forward svc/traefik 80:80 -n traefik
```

## Configuration

Configuration is loaded from environment variables and can also be edited from the Settings page. Settings saved through
the UI are written to SQLite, not source files.

Important variables:

- `MVD_CONSUMER_CP_URL`: consumer control-plane health/base URL.
- `MVD_PROVIDER_CP_URL`: provider control-plane health/base URL.
- `MVD_CONSUMER_DP_URL`: consumer data-plane health/base URL.
- `MVD_PROVIDER_DP_URL`: provider data-plane health/base URL.
- `MVD_CONSUMER_IH_URL`: consumer IdentityHub DID endpoint URL.
- `MVD_PROVIDER_IH_URL`: provider IdentityHub DID endpoint URL.
- `MVD_PROVIDER_VAULT_URL`: provider Vault health URL.
- `MVD_ISSUER_URL`: issuer base URL.
- `MVD_TRAEFIK_URL`: Traefik service URL.
- `MVD_PROVIDER_DSP_URL`: provider DSP endpoint included in catalog, contract, and transfer requests.
- `MVD_PROVIDER_ID`: provider participant ID.
- `MVD_API_KEY_HEADER` and `MVD_API_KEY_VALUE`: management API key header and value.
- `MVD_MOCK_MODE`: `auto`, `on`, or `off`.

## Health Checks

Health checks are deliberately less strict than a normal backend readiness gate:

- HTTP `200-299` is healthy.
- IdentityHub `204 No Content` is healthy because it proves the DID endpoint is reachable.
- Traefik `404` at `/` is shown as Warning/Reachable because it usually means Traefik is up but no route matched `/`.
- Connection failures, timeouts, and DNS failures are Offline.

The deployment status page shows a human-readable explanation first. Checked URL, status code, latency, and raw errors
remain available in technical detail panels and Advanced Diagnostics.

## Mock Mode

`MVD_MOCK_MODE=auto` tries the real MVD service and falls back to MVD-like mock responses only when a service call fails.
Use `MVD_MOCK_MODE=on` to demo the UI without MVD, or `MVD_MOCK_MODE=off` to fail fast when a service is unavailable.

Mock mode is explicit in trace results. A recorded event still shows the real URL that would have been called, plus
whether mock data was used.

## Dashboard Features

- Platform choice page for FIWARE vs EDC.
- FIWARE preparation page using guided demo and DSSC audit patterns.
- EDC process visualization with swimlane-like actors and local custom process cards.
- Scenario wizard with big numbered steps and mini executable steps (primary way to run use cases).
- Plain-language result summaries with technical logs hidden behind toggles.
- Settings page for service URLs and credentials.
- Deployment status page with reachable/warning/offline health classification.
- Execution History for saved scenario runs.
- Advanced Diagnostics for trace timeline, sequence view, and root-cause analysis (read-only; scenarios are run from the wizard).
- SQLite-backed traces and trace events.
- Redacted headers and payload display.

## Documentation

- `docs/guides/how-this-codebase-runs.md`: beginner-friendly explanation of the TypeScript/Next.js codebase.
- `docs/guides/validation-platform-redesign.md`: broader redesign and deployment plan.

## Commit And Repository Safety

This repository is safe to publish as source code when only the intended files are committed.

- Commit `.env.example`, but do not commit `.env.local` or other `.env*` files with real deployment values.
- Do not commit `.next/`, `out/`, `build/`, `node_modules/`, or `coverage/`.
- Do not commit `data/`, `*.sqlite`, `*.sqlite-*`, `*.db`, or `*.db-*`; traces and saved settings can contain local
  endpoint details and redacted operational payloads.
- The dashboard redacts common secret fields before storing trace events, but this is still a local developer tool. Do
  not expose it directly on a public network without adding authentication and reviewing the Settings API.
- The included `password` API key is the public MVD demo default, not a private credential.

## Verification

Before committing, run:

```bash
npm run typecheck
npm run lint
```

Use `npm run build` when you want to verify a production Next.js build.

## Troubleshooting

- `npm run dev` fails with missing `package.json`: run it from this `mvd-trace-dashboard` folder, not the MVD backend folder.
- `404` for `/api/management/...`: this MVD deployment exposes `/api/mgmt/v4/...`; test catalog with `POST`, not `GET`.
- Traefik shows `404` at `/`: Traefik may still be reachable; use a hostname route or check Deployment Status.
- `502 Unable to obtain credentials`: the route is reachable, but the MVD connector cannot obtain its participant STS
  client secret from the vault.
- Missing offer, negotiation, agreement, or transfer IDs: inspect the latest trace in Advanced Diagnostics.
- Hydration warnings after code changes: refresh the page so Turbopack serves the latest client bundle.
