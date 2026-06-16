# Dataspace Use-Case Validation Platform

Educational Next.js dashboard for **validating and explaining** Eclipse Dataspace Components (EDC) scenarios against a
deployed **Minimum Viable Dataspace (MVD)** cluster. A separate FIWARE track (`/fiware`) remains available for preparation
and audit presentation only.

The dashboard does **not** deploy or modify MVD. It calls live connector, IdentityHub, IssuerService, and data-plane
APIs, explains each step in stakeholder-friendly language, and records redacted traces for review.

**Default behaviour:** `MVD_MOCK_MODE=off` — every wizard step hits the real MVD stack. Failures (for example `502 Unable
to obtain credentials` when Vault secrets are missing) are shown immediately in Execution History and Advanced
Diagnostics.

For a beginner-friendly walkthrough of how the TypeScript and Next.js code fits together, read
`docs/guides/how-this-codebase-runs.md`.

## What You See In The App

The home page `/` introduces the **Core Demo** use case (`UC-CORE`) — five DS4SSCC Show & Tell steps wired to real MVD management
APIs:

1. Onboard participant (health probes).
2. Create / publish data offer (catalog request).
3. Request data access (contract negotiation).
4. Access & use data (transfer + data-plane fetch).
5. Offboard / revoke access (terminate transfer, IssuerService credential revoke, verify denial).

Open the scenario wizard at `/scenario-wizard?useCase=UC-CORE`. Technical validation use cases (UC-E1 … UC-E6) live under
`/use-cases`.

Each stage explains what the user sees, what the system does, who is responsible, success criteria, DSSC mapping, and
optional technical details. Users can also add custom process cards locally in the browser.

## How It Works

This project uses the Next.js App Router. Pages live in `src/app`, reusable UI lives in `src/components`, and backend
helper logic lives in `src/lib`.

Important files:

- `src/app/page.tsx`: Core Demo home and links into the scenario wizard.
- `src/app/fiware/page.tsx`: FIWARE preparation and audit page (presentation track only).
- `src/app/use-cases/page.tsx`: EDC use-case overview with process visualization.
- `src/components/ScenarioWizardClient.tsx`: guided EDC scenario runner.
- `src/components/ProcessVisualizationClient.tsx`: stakeholder process view and local custom process cards.
- `src/components/DeploymentStatusClient.tsx`: service reachability dashboard.
- `src/app/api/mvd/route.ts`: API route used by the browser to run MVD actions.
- `src/app/api/ready/route.ts`: readiness and health endpoint for the dashboard.
- `src/lib/mvdClient.ts`: outbound MVD HTTP calls, IssuerService OAuth, health checks, and trace recording.
- `src/lib/issuerAuth.ts`: Keycloak client-credentials token for IssuerService admin API.
- `src/lib/mvdFlow.ts`: endpoint paths, default config, request payload builders, and ID extraction.
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
- Terminate transfer: `POST {CONSUMER_CP_MANAGEMENT}/api/mgmt/v4/transferprocesses/{id}/terminate`
- Revoke membership VC: `POST {ISSUER_ADMIN}/participants/issuer/credentials/{id}/revoke` (Keycloak OAuth)
- Verify credential status: `GET {ISSUER_ADMIN}/participants/issuer/credentials/{id}/status`

The HTTP management route version is `/api/mgmt/v4`. The JSON-LD context in request bodies can still be
`https://w3id.org/edc/connector/management/v2`; that context is not the same thing as the HTTP route version.

## Run Locally

Install dependencies and start the dashboard:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy environment defaults and point them at your MVD deployment (Traefik `*.localhost` or in-cluster DNS):

```bash
cp .env.example .env.local
```

Keep **`MVD_MOCK_MODE=off`** unless you deliberately want UI-only exploration without a cluster.

## Run With MVD

Deploy and **seed** the MVD Kubernetes stack first (`identityhub-seed`, `controlplane-seed`, `issuerservice-seed` in the
[MinimumViableDataspace](https://github.com/eclipse-dataspace-hub/MinimumViableDataspace) repo). The dashboard assumes
participants, Vault secrets, and catalog assets already exist.

Defaults target an in-cluster / EduCloud style deployment, for example:

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
- `MVD_CONSUMER_ID`: consumer participant DID (must match IdentityHub seed).
- `MVD_ISSUER_PARTICIPANT_CONTEXT`: IssuerService tenant context (default `issuer`).
- `MVD_ISSUER_URL`: IssuerService admin base URL (`…/api/admin/v1alpha`, port `10013`). Legacy `…/admin` URLs in Settings are migrated automatically.
- `MVD_ISSUER_HEALTH_URL`: IssuerService readiness URL (port `10010`).
- `MVD_KEYCLOAK_URL`, `MVD_KEYCLOAK_REALM`, `MVD_ISSUER_OAUTH_CLIENT_ID`, `MVD_ISSUER_OAUTH_CLIENT_SECRET`: OAuth for credential revoke during offboarding.
- `MVD_TRAEFIK_URL`: Traefik service URL.
- `MVD_PROVIDER_DSP_URL`: provider DSP endpoint for catalog, contract, and transfer requests.
- `MVD_PROVIDER_ID`: provider participant ID.
- `MVD_API_KEY_HEADER` and `MVD_API_KEY_VALUE`: management API key header and value.
- `MVD_MOCK_MODE`: `on` or `off` (default **off** — always calls the real MVD deployment).

## Health Checks

Health checks are deliberately less strict than a normal backend readiness gate:

- HTTP `200-299` is healthy.
- IdentityHub `204 No Content` is healthy because it proves the DID endpoint is reachable.
- Traefik `404` at `/` is shown as Warning/Reachable because it usually means Traefik is up but no route matched `/`.
- Connection failures, timeouts, and DNS failures are Offline.

The deployment status page shows a human-readable explanation first. Checked URL, status code, latency, and raw errors
remain available in technical detail panels and Advanced Diagnostics.

## Mock Mode (optional)

Default is **`MVD_MOCK_MODE=off`**: every wizard step calls real services. Errors surface immediately in the UI and traces.

Set **`MVD_MOCK_MODE=on`** only when you need to explore the UI without a live cluster. Traces still record the URLs
that would have been called and mark events as mock.

## Dashboard Features

- Core Demo (`UC-CORE`) with live flow map and real MVD execution.
- FIWARE preparation page (`/fiware`) for audit rehearsal — no backend calls.
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
- The included `password` API key matches the public MVD sample deployment default from the Bruno collection.

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
- `502 Unable to obtain credentials` / missing Vault alias (for example `consumer-participant-sts-client-secret`): MVD is reachable but the consumer connector cannot read STS secrets. Re-run `identityhub-seed` and confirm Vault seed jobs completed (`k8s/consumer/application/identityhub-seed.yaml` in MinimumViableDataspace).
- Offboarding fails on IssuerService: confirm `MVD_ISSUER_URL` uses `…/api/admin/v1alpha` on port `10013`, Keycloak is reachable, and `MVD_ISSUER_PARTICIPANT_CONTEXT=issuer`.
- Traces show `mock-transfer-1` or `0 ms` on every step: **mock mode is on** in Settings — set `MVD_MOCK_MODE=off` for real calls.
- Missing offer, negotiation, agreement, or transfer IDs: inspect the latest trace in Advanced Diagnostics.
- Hydration warnings after code changes: refresh the page so Turbopack serves the latest client bundle.
