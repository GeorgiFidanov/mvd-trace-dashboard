# Endpoint Confirmation TODO

- Confirm whether the preferred negotiation polling endpoint should be `GET /api/mgmt/v4/contractnegotiations/{id}` or the Bruno query endpoint `POST /api/mgmt/v4/contractnegotiations/request` for the currently deployed MVD version. The dashboard uses the end-to-end test's direct `GET` endpoint.
- Confirm whether transfer polling should continue to use `GET /api/mgmt/v4/transferprocesses/{id}/state` or switch to the Bruno query endpoint `POST /api/mgmt/v4/transferprocesses/request`. The dashboard uses the end-to-end test's direct state endpoint.
- Confirm whether `Authorization` is required for `GET /api/proxy/flows/{id}/data` in every MVD deployment. The end-to-end test sends the dataflow `access_token`; the Bruno request has the header disabled.
- Confirm IdentityHub and issuer management health endpoints if those services need first-class health checks beyond URL configuration.
