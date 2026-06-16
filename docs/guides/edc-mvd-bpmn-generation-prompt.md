# EDC MVD BPMN diagram generation prompts

Use these prompts with an image-generation or diagram agent (Figma, draw.io, Mermaid-to-PNG, DALL·E, etc.) to produce **FIWARE-style BPMN swimlane charts** adapted for **Eclipse Minimum Viable Dataspace (EDC MVD)**.

## Global style (apply to every diagram)

```
Create a professional BPMN 2.0-style process diagram on a light blue swimlane background.

Visual style:
- Swimlanes: horizontal bands, light blue (#E8F4FC), bold lane titles on the left
- Tasks: rounded yellow rectangles (#FFE082), black text, verb-first labels
- Gateways: orange diamonds for decisions (Approved/Rejected, Valid/Invalid, New/Revoke)
- Start events: thin green circle
- End events: red circle with thick border
- Sequence flow: solid black arrows within a lane
- Message flow: dashed black arrows between lanes
- Font: clean sans-serif (Arial/Helvetica), 11–12pt in tasks

Header subtitle on each diagram:
"EDC MVD · Eclipse Dataspace Components · Pink Panther validation dashboard"

Footer legend (small):
Solid arrow = sequence flow | Dashed arrow = message/API call between participants
Map FIWARE "Governance Authority / MPO / MRE" → "IdentityHub + Issuer + Vault"
Map FIWARE "Dataspace Operator" → "Consumer/Provider Control Planes + DSP"
Map "Resource description" → "Asset + ContractDefinition + Policy (ODRL)"
Map "Catalogue" → "DSP Catalog / POST /api/mgmt/v4/catalog/request"
```

---

## Diagram 1 — Core Demo (5 panels, one composite image)

**Reference:** DS4SSCC Show & Tell playbook Section 2 + your teammate's 5-panel BPMN.

**Prompt:**

```
Create ONE wide infographic with FIVE horizontal panels stacked vertically, titled:
"BPMN — EDC MVD Core Demo · five step processes"

Each panel is a mini swimlane diagram. Use these EDC MVD mappings:

PANEL 1 — Onboard a Participant
Swimlanes: Participant | Governance (IdentityHub/Issuer) | Platform (EDC connectors)
Flow:
- Start: "Register participant / DID ready"
- Participant → Governance (dashed): "Trust validation request"
- Governance: "Issue / verify membership credential (VC)"
- Governance → Platform (dashed): "Connector endpoints registered"
- Participant: "Consumer CP + Provider CP reachable (/api/check/health)"
- End: "Participant onboarded"
Building blocks label: Participants & Roles · Identity & Trust · Governance
EDC API callouts in small grey text: GET IdentityHub /cs, GET /api/check/health

PANEL 2 — Create / Publish a Data Offer
Swimlanes: Provider | Platform (Provider CP)
Flow:
- Start: "Create Asset + Policy + ContractDefinition"
- Provider: "Attach ODRL usage policy"
- Provider → Platform: "Publish to catalog (seeded in MVD)"
- Platform: "Catalog entry visible via DSP"
- Optional branch: "Update / remove offer"
- End: "Offer published"
EDC callouts: Provider mgmt POST assets/policies/contractdefinitions; consumer sees via catalog request

PANEL 3 — Request Data Access
Swimlanes: Consumer | Platform (Consumer CP) | Governance (policy)
Flow:
- Start: "Discover offer in catalog"
- Consumer → Platform: POST /api/mgmt/v4/catalog/request
- Consumer: "Select contract offer"
- Consumer → Platform: POST /api/mgmt/v4/contractnegotiations
- Platform → Governance: "ODRL + credential check"
- End: "Contract agreement ID created"
EDC callouts: getContractNegotiation poll until FINALIZED

PANEL 4 — Access & Use Data
Swimlanes: Provider | Platform (CP+DP) | Consumer
Flow:
- Start: "Agreement in place"
- Consumer → Platform: POST /api/mgmt/v4/transferprocesses (HttpData-PULL)
- Platform: "Open proxy dataflow / EDR"
- Provider → Platform → Consumer (dashed): "Secure data exchange"
- Consumer: "GET /api/proxy/flows/{id}/data with access_token"
- End: "Data received in dashboard"
EDC callouts: getEdrOrDataflow, fetchData

PANEL 5 — Offboard / Revoke Access
Swimlanes: Participant | Governance | Platform
Flow:
- Start: "Offboarding request"
- Participant → Platform: POST /api/mgmt/v4/transferprocesses/{id}/terminate
- Platform: "Transfer state → TERMINATED"
- Participant → Platform: "Retry data fetch without token"
- Platform: "HTTP 401/403/404 — access denied"
- End: "Access revoked for this agreement"
- Participant → Governance (IssuerService): GET credentials for consumer DID, POST revoke membership credential
- Governance: "Credential status → REVOKED"

Use same color coding as FIWARE BPMN reference. Export 2400×3600px PNG.
```

---

## Diagram 2 — BP03A equivalent: Onboarding a new participant (EDC MVD)

**Maps from:** FIWARE BP03A onboarding swimlane (Applicant ↔ Dataspace Coordinating Entity).

**Prompt:**

```
BPMN swimlane diagram titled "BP03A — EDC MVD Onboarding of a new Participant"

Top lane: "Applicant — Consumer or Provider (EDC participant)"
Bottom lane: "Governance — IdentityHub + Issuer + MVD seed"

Sequence:
1. Green start: "Trigger onboarding"
2. Applicant: "Deploy connector pod (Helm / MVD)"
3. Applicant → Governance (dashed): "Submit onboarding / DID document"
4. Governance: "Review participant in IdentityHub"
5. Orange diamond: Approved / Rejected
   - Rejected → "Notify rejection" → red end
   - Approved → "Generate key material in Vault"
6. Governance → Applicant (dashed): "STS client + API key"
7. Applicant: "Store credentials in connector"
8. Applicant → Governance (dashed): "Present Verifiable Credential"
9. Governance: "Register participant in dataspace"
10. Red end: "Participant onboarded — CP health 200"

Annotate EDC components: Consumer/Provider Control Plane, IdentityHub, HashiCorp Vault, Issuer service.
Do NOT use FIWARE NGSI-LD or TM Forum terms.
```

---

## Diagram 3 — BP05B equivalent: Provider manages resource descriptions (EDC MVD)

**Maps from:** FIWARE provider publishing/revoking resource descriptions.

**Prompt:**

```
BPMN swimlane diagram titled "BP05B — EDC MVD Provider publishes a Data Offer"

Top lane: "Provider (EDC Provider connector)"
Bottom lane: "Governance / Catalog (Provider CP + DSP catalog)"

Start: "Trigger publish or revoke"

Decision diamond: Revoke | New version | New
- Revoke branch: "Request asset/policy removal" → Governance: "Remove from catalog" → red end "Offer revoked"
- New / New version:
  Provider tasks: "Create Asset" → "Define ODRL Policy" → "Create ContractDefinition"
  Provider → Governance (dashed): "Sign & submit (management API)"
  Governance: "Validate asset + policy"
  Diamond Valid/Invalid — Invalid loops back to Provider "Fix metadata"
  Valid → "Expose via DSP catalog"
  If New version: "Deprecate previous contract definition"
  Red end: "Offer published"

Label resources as: Asset ID, Policy ID, Contract Definition, not "TMF620 product".
Include API hints: Provider Mgmt API, DSP catalog protocol.
```

---

## Diagram 4 — BP06 equivalent: Consumer searches catalog (EDC MVD)

**Maps from:** FIWARE consumer catalogue search with policy filter.

**Prompt:**

```
BPMN swimlane diagram titled "BP06 — EDC MVD Consumer discovers assets in catalog"

Top lane: "Consumer (Municipality / data user)"
Bottom lane: "Platform — Consumer CP + Federated catalog"

Start: "Trigger catalog discovery"

Consumer: "Search dataspace catalog"
Consumer → Platform (dashed): POST /api/mgmt/v4/catalog/request with provider DSP counterPartyAddress

Platform tasks:
- "Apply ODRL / participant filter"
- "Execute DSP catalog query"
- "Return datasets + contract offers (DCAT/JSON-LD)"

Platform → Consumer (dashed): Catalog response

Consumer: "Select asset + contract offer ID"
Red end: "Resources selected for negotiation"

Show extracted IDs: assetId, contractOfferId (as in Pink Panther dashboard).
No FIWARE Context Broker — use EDC catalog request/response.
```

---

## Diagram 5 (optional) — End-to-end sequence overlay

**Prompt:**

```
Create a single-page architecture sequence diagram (not full BPMN) showing EDC MVD message order:

Dashboard → Consumer CP: catalog, negotiation, transfer
Consumer CP ↔ Provider CP: DSP protocol
Consumer CP → Consumer DP: EDR / dataflow
Consumer DP → Provider DP: proxy pull
Dashboard → Consumer CP: terminateTransfer
Dashboard → Consumer DP: verify denied fetch

Actors as boxes: Pink Panther Dashboard, Consumer CP, Consumer DP, Provider CP, Provider DP, IdentityHub.
Use numbered steps 1–12. Light background, suitable for report appendix.
```

---

## How this maps to the Pink Panther dashboard

| Playbook step | Wizard step ID        | MVD API calls (mockMode=off) |
|---------------|----------------------|------------------------------|
| 1 Onboard     | core-onboard         | health checks (CP, DP, IH, Vault) |
| 2 Publish     | core-publish         | POST catalog/request |
| 3 Request     | core-request-access  | POST contractnegotiations, GET negotiation |
| 4 Use data    | core-access-data     | POST transferprocesses, GET dataflow, GET data |
| 5 Offboard    | core-offboard        | POST transfer/terminate, poll TERMINATED, GET issuer credentials, POST revoke, GET status, GET data (expect deny) |

---

## Files to attach when prompting the agent

1. FIWARE reference screenshots (BP03A, BP05B, BP06, Core Demo 5-panel)
2. This prompt document
3. `README.md` from mvd-trace-dashboard for endpoint list
4. Optional: screenshot of Pink Panther Core Demo live flow map (`/scenario-wizard?useCase=UC-CORE`)
