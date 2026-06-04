# Dataspace Use-Case Validation Platform Redesign

## 1. Refactored Architecture Proposal

The dashboard is no longer positioned as an EDC operations/debugging console. It is a scenario-facing validation
platform that explains dataspace behavior through use cases, while preserving trace-level diagnostics for evaluators.

The target architecture has three layers:

- Experience layer: Overview, Use Cases, Scenario Wizard, Execution History, Architecture, Deployment Status, Advanced
  Diagnostics, and Settings.
- Validation layer: scenario definitions, wizard state, use-case success criteria, history mapping, and outcome
  summaries.
- EDC integration layer: Next.js dashboard API routes, MVD client helpers, trace recording, redaction, SQLite storage, health, and
  readiness checks.

The existing MVD execution code remains the technical foundation. The redesign changes the vocabulary and routing around
that foundation so users see "Identity verified", "Catalog discovered", and "Data received" before they see
`contractNegotiationId` or DSP payloads.

## 2. Updated Folder Structure

```text
src/
  app/
    page.tsx                         # Platform overview
    use-cases/page.tsx               # UC-E1..UC-E6 cards
    scenario-wizard/page.tsx         # Guided use-case workflow
    execution-history/page.tsx       # Historical execution records
    architecture/page.tsx            # Component architecture
    deployment-status/page.tsx       # EduCloud readiness view
    advanced-diagnostics/page.tsx    # Trace timeline, sequence, raw payloads
    settings/page.tsx                # Environment configuration
    api/
      health/route.ts                # Liveness
      ready/route.ts                 # Readiness
      mvd/route.ts                   # MVD action dashboard API
      traces/route.ts                # Trace history
      settings/route.ts              # Runtime settings
  components/
    AppShell.tsx
    UseCaseCards.tsx
    ScenarioWizardClient.tsx
    ExecutionHistoryClient.tsx
    DeploymentStatusClient.tsx
    DashboardClient.tsx              # Technical diagnostics/settings utility
  lib/
    useCases.ts                      # Use-case and wizard definitions
    mvdClient.ts                     # MVD HTTP execution and tracing
    mvdFlow.ts                       # Endpoint paths, payloads, ID extraction
    storage.ts                       # SQLite traces/settings
    redaction.ts                     # Secret masking
k8s/
  configmap.yaml
  secret.example.yaml
  deployment.yaml
  service.yaml
  ingress.yaml
```

## 3. Updated UI Hierarchy

- Overview: explains the platform and shows all use-case cards.
- Use Cases: detailed UC-E1 through UC-E6 validation cards with success criteria and run/result actions.
- Scenario Wizard: guided process view inspired by the Dataspace Scenario Wizard.
- Execution History: timestamp, use case, status, duration, environment, and trace ID.
- Architecture: visual explanation of dashboard, dashboard API, EDC participant services, IdentityHub, Vault, PostgreSQL, and
  Traefik.
- Deployment Status: Kubernetes-facing service health and readiness.
- Advanced Diagnostics: technical trace timeline, sequence view, raw requests, raw responses, protocol payloads, and
  extracted IDs.
- Settings: endpoint and API key configuration for local or EduCloud environments.

## 4. Component Breakdown

- `AppShell`: shared navigation and product framing.
- `UseCaseCards`: scenario cards for UC-E1..UC-E6.
- `ScenarioWizardClient`: step progression, scenario execution, replay, and individual-step execution.
- `ExecutionHistoryClient`: filterable execution records derived from traces.
- `DeploymentStatusClient`: service readiness cards backed by `/api/ready`.
- `DashboardClient`: advanced technical execution and diagnostics retained for evaluators.
- `TraceTimeline` and `SequenceView`: low-level trace visualization used only in Advanced Diagnostics.
- `JsonBlock`: hidden-by-default raw payload display.

## 5. Database And Storage Requirements

The current SQLite store remains acceptable for a local demonstrator and single-pod EduCloud pilot:

- `traces`: scenario execution summary and extracted EDC IDs.
- `trace_events`: step-level requests, responses, redacted headers, extracted IDs, status, and timing.
- `settings`: runtime MVD configuration saved from the Settings page.

Future multi-user or multi-pod deployments should replace local SQLite with PostgreSQL or another shared persistence
layer. The trace model should then add:

- `useCaseId`
- `scenarioId`
- `environment`
- `startedBy`
- `exportedAt`
- `findingSummary`

## 6. Kubernetes Deployment Structure

The repository includes initial EduCloud deployment scaffolding:

- `Dockerfile`: builds a standalone Next.js production image.
- `.dockerignore`: excludes local traces, dependencies, build output, and env files.
- `k8s/configmap.yaml`: non-secret runtime configuration.
- `k8s/secret.example.yaml`: API key secret template.
- `k8s/deployment.yaml`: dashboard deployment with liveness/readiness probes.
- `k8s/service.yaml`: ClusterIP service.
- `k8s/ingress.yaml`: Traefik ingress placeholder.

Readiness uses `GET /api/ready` and verifies control-plane connectivity, data-plane connectivity, and database
connectivity. Liveness uses `GET /api/health`.

## 7. EduCloud Deployment Checklist

- Build and push the dashboard image to the approved registry.
- Replace the image reference in `k8s/deployment.yaml`.
- Set EduCloud hostnames and namespaces in `k8s/configmap.yaml`.
- Create a real Kubernetes Secret from `k8s/secret.example.yaml`.
- Confirm Traefik ingress class and TLS requirements.
- Confirm network policies allow the dashboard pod to reach consumer CP, provider CP, and consumer DP.
- Decide whether local SQLite with `emptyDir` is acceptable or whether persistent/shared storage is required.
- Set `NEXT_PUBLIC_CLUSTER_NAME`, `NEXT_PUBLIC_ENVIRONMENT`, and `NEXT_PUBLIC_OTEL_ENDPOINT`.
- Confirm `/api/ready` returns 200 before demonstrations.
- Add authentication before exposing the dashboard beyond trusted project users.

## 8. Migration Plan From The Current Dashboard

1. Keep the existing MVD dashboard API, trace storage, and redaction logic.
2. Introduce use-case definitions and scenario success criteria.
3. Replace the primary navigation with the new information architecture.
4. Move raw EDC IDs and protocol payloads to Advanced Diagnostics.
5. Add the Scenario Wizard as the default execution path for UC-E5.
6. Redirect old technical routes to scenario routes.
7. Add execution history views over existing traces.
8. Add health/readiness APIs and Kubernetes deployment manifests.
9. Extend trace records with explicit use-case metadata when multi-user evaluation begins.
10. Add export support for UC-E6 interoperability findings.
