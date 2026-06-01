# MVD Trace Dashboard

Developer dashboard for tracing the Eclipse EDC `MinimumViableDataspace` catalog, contract negotiation, transfer,
EDR/dataflow, and final data fetch process.

## Why This Exists

The MVD demo proves that two EDC participants can discover data, negotiate a contract, start a transfer, and fetch data.
When that flow fails, the useful details are spread across browser requests, control-plane APIs, data-plane APIs, and
Kubernetes logs. This dashboard was created as a local debugging companion that records each step in one place.

It is intentionally scoped as a demo/playground tool. It does not modify or deploy the MVD backend. A Next.js backend for
frontend (BFF) calls the existing MVD APIs, redacts sensitive headers and payload fields, and stores traces in a local
SQLite database at `data/mvd-traces.sqlite`.

## How It Works

The UI is a Next.js App Router application. User actions call local API routes under `src/app/api`, and those routes call
the MVD control plane or data plane through helpers in `src/lib`.

- `src/components/DashboardClient.tsx` owns the interactive dashboard, manual step buttons, full-flow runner, settings
  form, trace timeline, and last-result panel.
- `src/app/api/mvd/route.ts` is the BFF entry point for MVD actions such as catalog, negotiation, transfer, EDR/dataflow,
  final data fetch, and health checks.
- `src/lib/mvdClient.ts` performs outbound MVD HTTP calls, records each trace event, and falls back to mock responses when
  `MVD_MOCK_MODE=auto` and a service is unavailable.
- `src/lib/mvdFlow.ts` defines endpoint paths, request payloads, and ID extraction from MVD/EDC response shapes.
- `src/lib/storage.ts` creates and reads the local SQLite trace database.
- `src/lib/redaction.ts` masks API keys, authorization headers, tokens, secrets, and password-like values before storage.

The normal flow is:

1. Request the provider catalog from the consumer control plane.
2. Extract the asset ID and contract offer ID.
3. Start and poll contract negotiation until a contract agreement ID is available.
4. Start and poll transfer until a transfer process is available.
5. Read the open EDR/dataflow metadata from the consumer data plane.
6. Fetch the final data through the data-plane proxy.
7. Store every step as a trace event for timeline and sequence views.

## MVD Endpoint Mapping

Mapped from the MVD README, Bruno collection, Kubernetes config, end-to-end tests, and local route probing:

- Catalog: `POST {CONSUMER_CP}/api/mgmt/v4/catalog/request`
- Start negotiation: `POST {CONSUMER_CP}/api/mgmt/v4/contractnegotiations`
- Poll negotiation: `GET {CONSUMER_CP}/api/mgmt/v4/contractnegotiations/{id}`
- Start transfer: `POST {CONSUMER_CP}/api/mgmt/v4/transferprocesses`
- Poll transfer: `GET {CONSUMER_CP}/api/mgmt/v4/transferprocesses/{id}/state`
- Open dataflow/EDR: `GET {CONSUMER_DP}/api/proxy/flows/{id}`
- Fetch data: `GET {CONSUMER_DP}/api/proxy/flows/{id}/data`

The HTTP management route version is `/api/mgmt/v4`. The JSON-LD context in request bodies can still be
`https://w3id.org/edc/connector/management/v2`; that context is not the same thing as the HTTP route version.

The default demo API key is `X-Api-Key: password`, matching the public MVD Bruno collection. Replace it for any
non-demo deployment.

## Run With Local MVD

Deploy and seed the MVD Kubernetes demo first, then keep the Traefik port-forward running:

```bash
kubectl port-forward svc/traefik 80:80 -n traefik
```

Copy environment defaults and adjust any URLs for your machine:

```bash
cp .env.example .env.local
```

Install dependencies and start the dashboard:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

Configuration is loaded from environment variables and can also be edited from the Settings page. Settings saved through
the UI are written to the local SQLite database, not to source files.

Important variables:

- `MVD_CONSUMER_CP_URL`: consumer control-plane base URL.
- `MVD_PROVIDER_CP_URL`: provider control-plane base URL, currently used for health checks.
- `MVD_CONSUMER_DP_URL`: consumer data-plane proxy base URL.
- `MVD_PROVIDER_DSP_URL`: provider DSP endpoint included in catalog, contract, and transfer requests.
- `MVD_PROVIDER_ID`: provider participant ID.
- `MVD_API_KEY_HEADER` and `MVD_API_KEY_VALUE`: management API key header and value.
- `MVD_MOCK_MODE`: `auto`, `on`, or `off`.

## Mock Mode

`MVD_MOCK_MODE=auto` is the default. The BFF tries the real MVD service and falls back to MVD-like mock responses only
when a service call fails. Use `MVD_MOCK_MODE=on` to demo the UI without MVD, or `MVD_MOCK_MODE=off` to fail fast when a
service is unavailable.

Mock mode is deliberately explicit in trace results. A recorded event still shows the real URL that would have been
called, plus whether mock data was used.

## Dashboard Features

- Settings page for control-plane, data-plane, IdentityHub, issuer, and API key configuration.
- Manual execution for catalog, negotiation, transfer, EDR/dataflow, and data fetch steps.
- "Run Full Demo Flow" orchestration with polling.
- SQLite-backed traces and trace events.
- Redacted headers and payload display with explicit reveal controls.
- Timeline and generated sequence view.

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

- `404` for `/api/management/...`: this MVD deployment exposes `/api/mgmt/v4/...`; test catalog with `POST`, not `GET`.
- `502 Unable to obtain credentials`: the route is reachable, but the MVD connector cannot obtain its participant STS
  client secret from the vault.
- Missing offer, negotiation, agreement, or transfer IDs: open the Last Result panel and inspect the latest redacted
  response shape. `src/lib/mvdFlow.ts` contains the extraction logic.
- Hydration warnings after code changes: refresh the page so Turbopack serves the latest client bundle.

## Known Assumptions

See `TODO.md` for endpoint assumptions that should be re-confirmed against future MVD versions.
