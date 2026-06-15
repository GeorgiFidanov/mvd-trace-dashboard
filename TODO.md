# Endpoint Confirmation TODO

- Confirm whether the preferred negotiation polling endpoint should be `GET /api/mgmt/v4/contractnegotiations/{id}` or the Bruno query endpoint `POST /api/mgmt/v4/contractnegotiations/request` for the currently deployed MVD version. The dashboard uses the end-to-end test's direct `GET` endpoint.
- Confirm whether transfer polling should continue to use `GET /api/mgmt/v4/transferprocesses/{id}/state` or switch to the Bruno query endpoint `POST /api/mgmt/v4/transferprocesses/request`. The dashboard uses the end-to-end test's direct state endpoint.
- Confirm whether `Authorization` is required for `GET /api/proxy/flows/{id}/data` in every MVD deployment. The end-to-end test sends the dataflow `access_token`; the Bruno request has the header disabled.
- Confirm IdentityHub and issuer management health endpoints if those services need first-class health checks beyond URL configuration.

# Platform TODO

- Investigate consumer data-plane `fetchData` HTTP 500 responses against the deployed MVD demo (dataplane proxy / flow data endpoint).
- Re-run `identityhub-seed` for the consumer namespace if credential issuance is still blocked after a Vault reset.

# Recently completed

- Fixed `DashboardClient` trace timeline using collapsed `visibleEvents` (typecheck/build).
- Standardized Pink Panther team branding and LCP image loading.
- Added MVD v3 EDR fallback (`GET /api/mgmt/v3/edrs/{id}/dataaddress`) when data-plane proxy returns 204.
- UC-E5 wizard step list no longer includes UC-E6 interoperability findings.
- Data retrieval waits for transfer/EDR with user-visible 204 messaging; traces mark pending/waiting states.
