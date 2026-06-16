export type UseCaseStatus = "ready" | "running" | "success" | "warning" | "failed";
export type WizardStepStatus = "pending" | "running" | "success" | "failed";
export type WizardStepRole = "trust" | "discovery" | "policy" | "exchange" | "data";

export type WizardStepDefinition = {
  id: string;
  title: string;
  shortTitle: string;
  role: WizardStepRole;
  useCaseIds: string[];
  action?:
    | "health"
    | "requestCatalog"
    | "startContractNegotiation"
    | "getContractNegotiation"
    | "startTransfer"
    | "getTransfer"
    | "getEdrOrDataflow"
    | "fetchData"
    | "requestDataAccess"
    | "accessUseData"
    | "offboardParticipant";
  explanation: string;
  successCriteria: string;
  outcomeSummary: string;
  playbookStage?: number;
};

export type DataspaceUseCaseKind = "playground" | "technical";

export type DataspaceUseCase = {
  id: string;
  title: string;
  shortTitle: string;
  goal: string;
  description: string;
  successCriteria: string;
  status: UseCaseStatus;
  primaryRoute: string;
  kind?: DataspaceUseCaseKind;
};

export const useCases: DataspaceUseCase[] = [
  {
    id: "UC-CORE",
    title: "Core Demo Playground",
    shortTitle: "Core Demo",
    goal: "Walk through the DS4SSCC Show & Tell Core Demo — onboard, publish, request, use, and offboard — in plain language.",
    description:
      "The main onboarding flow for non-technical audiences. Click each of the five playbook steps, pick a catalog asset, and mix scenario labels to explore how a dataspace works.",
    successCriteria: "All five Core Demo steps complete with trace evidence for each business action.",
    status: "ready",
    primaryRoute: "/scenario-wizard?useCase=UC-CORE",
    kind: "playground",
  },
  {
    id: "UC-E1",
    title: "Provider-to-Consumer Data Discovery & Transfer",
    shortTitle: "Data Discovery & Transfer",
    goal: "Validate that a consumer can discover and retrieve data from a provider.",
    description: "Runs catalog discovery, contract negotiation, transfer initialization, and final data retrieval.",
    successCriteria: "Consumer receives the correct data asset.",
    status: "ready",
    primaryRoute: "/scenario-wizard?useCase=UC-E1",
    kind: "technical",
  },
  {
    id: "UC-E2",
    title: "Identity & Trust Verification",
    shortTitle: "Identity & Trust",
    goal: "Validate DID, Identity Hub, DCP, and Verifiable Credential interactions.",
    description: "Checks whether participant trust prerequisites are reachable before protected resources are accessed.",
    successCriteria: "Only valid credential holders can access protected resources.",
    status: "warning",
    primaryRoute: "/scenario-wizard?useCase=UC-E2",
    kind: "technical",
  },
  {
    id: "UC-E3",
    title: "ODRL Policy Enforcement",
    shortTitle: "Policy Enforcement",
    goal: "Validate policy-based access control.",
    description: "Shows where policy terms are evaluated before a contract and transfer are allowed.",
    successCriteria: "Policy engine correctly permits or denies access according to ODRL constraints.",
    status: "ready",
    primaryRoute: "/scenario-wizard?useCase=UC-E3",
    kind: "technical",
  },
  {
    id: "UC-E4",
    title: "Federated Catalog Discovery",
    shortTitle: "Federated Discovery",
    goal: "Validate cross-participant asset discovery.",
    description: "Demonstrates discovery of provider assets through dataspace catalog interactions.",
    successCriteria: "Consumer discovers and negotiates assets through federated catalogs.",
    status: "ready",
    primaryRoute: "/scenario-wizard?useCase=UC-E4",
    kind: "technical",
  },
  {
    id: "UC-E5",
    title: "End-to-End Dataspace Scenario",
    shortTitle: "End-to-End Scenario",
    goal: "Validate the complete dataspace flow.",
    description: "Runs identity verification, discovery, negotiation, policy validation, transfer, and data retrieval.",
    successCriteria: "Identity verification, discovery, negotiation, transfer, and data retrieval all complete successfully.",
    status: "ready",
    primaryRoute: "/scenario-wizard?useCase=UC-E5",
    kind: "technical",
  },
  {
    id: "UC-E6",
    title: "Interoperability Findings",
    shortTitle: "Interoperability Findings",
    goal: "Document interoperability observations, limitations, and lessons learned.",
    description: "Captures findings from execution results, endpoint assumptions, failures, and protocol observations.",
    successCriteria: "Technical findings are captured and exported.",
    status: "warning",
    primaryRoute: "/scenario-wizard?useCase=UC-E6",
    kind: "technical",
  },
];

export const playgroundUseCases = useCases.filter((useCase) => useCase.kind === "playground");
export const technicalUseCases = useCases.filter((useCase) => useCase.kind !== "playground");

export const wizardSteps: WizardStepDefinition[] = [
  {
    id: "core-onboard",
    title: "Onboard a Participant",
    shortTitle: "Onboard",
    role: "trust",
    useCaseIds: ["UC-CORE"],
    action: "health",
    playbookStage: 1,
    explanation:
      "Register the consumer and provider side of the dataspace: confirm identities, trust services, and connector endpoints are ready before any data is shared.",
    successCriteria: "Participant services are reachable and trust prerequisites are in place.",
    outcomeSummary: "The participant is onboarded and ready for governed data sharing.",
  },
  {
    id: "core-publish",
    title: "Create / Publish a Data Offer",
    shortTitle: "Publish",
    role: "discovery",
    useCaseIds: ["UC-CORE"],
    action: "requestCatalog",
    playbookStage: 2,
    explanation:
      "Browse what the provider has already published in the catalog — each entry is a data product with metadata and usage rules. Pick a different asset below to mix and match your demo story.",
    successCriteria: "At least one data product with a contract offer appears in the catalog.",
    outcomeSummary: "A governed data offer is visible and ready to request.",
  },
  {
    id: "core-request-access",
    title: "Request Data Access",
    shortTitle: "Request",
    role: "policy",
    useCaseIds: ["UC-CORE"],
    action: "requestDataAccess",
    playbookStage: 3,
    explanation:
      "The consumer selects a catalog product, submits an access request, and waits while identity and ODRL policy checks run until an agreement is created.",
    successCriteria: "Access is requested and a contract agreement is created under policy.",
    outcomeSummary: "The consumer received permission to use the selected data product.",
  },
  {
    id: "core-access-data",
    title: "Access & Use Data",
    shortTitle: "Use data",
    role: "data",
    useCaseIds: ["UC-CORE"],
    action: "accessUseData",
    playbookStage: 4,
    explanation:
      "Start the secure exchange, wait for the data plane to open, and retrieve the protected payload — the same outcome an application or dashboard would show to an end user.",
    successCriteria: "Data moves through the controlled exchange path and the payload is received.",
    outcomeSummary: "The consumer successfully accessed and used the provider data.",
  },
  {
    id: "core-offboard",
    title: "Offboard / Revoke Access",
    shortTitle: "Offboard",
    role: "trust",
    useCaseIds: ["UC-CORE"],
    action: "offboardParticipant",
    playbookStage: 5,
    explanation:
      "Terminate the active transfer, revoke the consumer membership credential in IssuerService (IdentityHub trust layer), then confirm the data plane denies a follow-up fetch.",
    successCriteria: "Transfer is terminated, credential status is revocation, and data fetch is denied.",
    outcomeSummary: "Access and trust are revoked — transfer terminated, membership VC revoked, data plane rejected the retry.",
  },
  {
    id: "identity-verification",
    title: "Identity Verification",
    shortTitle: "Identity",
    role: "trust",
    useCaseIds: ["UC-E2", "UC-E5"],
    action: "health",
    explanation: "Confirm that core participant services (control planes, data planes, identity hubs, vault) are reachable before starting a protected exchange. Issuer and Traefik are optional reachability probes.",
    successCriteria: "The platform can reach the configured participant services.",
    outcomeSummary: "Participants are present and ready for a trusted dataspace interaction.",
  },
  {
    id: "catalog-discovery",
    title: "Catalog Discovery",
    shortTitle: "Catalog",
    role: "discovery",
    useCaseIds: ["UC-E1", "UC-E3", "UC-E4", "UC-E5"],
    action: "requestCatalog",
    explanation: "Ask the provider what data assets are available to this consumer.",
    successCriteria: "A data asset and contract offer are discovered.",
    outcomeSummary: "The consumer found an available provider data asset.",
  },
  {
    id: "offer-selection",
    title: "Offer Selection",
    shortTitle: "Offer",
    role: "policy",
    useCaseIds: ["UC-E1", "UC-E3", "UC-E5"],
    explanation: "Translate the catalog response into a clear offer and policy decision point.",
    successCriteria: "The discovered offer is ready for negotiation.",
    outcomeSummary: "The platform selected an offer that matches the scenario objective.",
  },
  {
    id: "contract-negotiation",
    title: "Contract Negotiation",
    shortTitle: "Negotiate",
    role: "exchange",
    useCaseIds: ["UC-E1", "UC-E3", "UC-E5"],
    action: "startContractNegotiation",
    explanation: "Request access under the selected contract offer and wait for an agreement.",
    successCriteria: "A contract negotiation and agreement are created.",
    outcomeSummary: "The provider and consumer agreed on terms for data use.",
  },
  {
    id: "policy-validation",
    title: "Policy Validation",
    shortTitle: "Policy",
    role: "policy",
    useCaseIds: ["UC-E1", "UC-E3", "UC-E5"],
    action: "getContractNegotiation",
    explanation: "Poll negotiation state and surface whether policy and trust checks allow progress.",
    successCriteria: "The agreement remains valid and is not terminated by policy.",
    outcomeSummary: "The policy decision allowed the dataspace exchange to continue.",
  },
  {
    id: "transfer-initialization",
    title: "Transfer Initialization",
    shortTitle: "Transfer",
    role: "exchange",
    useCaseIds: ["UC-E1", "UC-E5"],
    action: "startTransfer",
    explanation: "Start the data transfer based on the agreed contract.",
    successCriteria: "A transfer process is created and reaches a started state.",
    outcomeSummary: "The agreed data exchange was initialized.",
  },
  {
    id: "data-retrieval",
    title: "Data Retrieval",
    shortTitle: "Data",
    role: "data",
    useCaseIds: ["UC-E1", "UC-E5"],
    action: "fetchData",
    explanation:
      "Retrieve the final data through the consumer data-plane proxy. HTTP 204 from the dataflow endpoint means the transfer exists but the proxy flow is not open yet — the dashboard waits and retries automatically.",
    successCriteria: "The consumer receives the protected data payload.",
    outcomeSummary: "The consumer successfully received the provider data.",
  },
  {
    id: "interoperability-findings",
    title: "Interoperability Findings",
    shortTitle: "Findings",
    role: "data",
    useCaseIds: ["UC-E6"],
    explanation: "Capture endpoint behavior, assumptions, failures, and lessons learned from the latest scenario runs.",
    successCriteria: "A findings record is created and linked to a trace ID for export or review.",
    outcomeSummary: "A findings record is available for review in Execution History and Advanced Diagnostics.",
  },
];

export const roleLabels: Record<WizardStepRole, string> = {
  trust: "Trust",
  discovery: "Discovery",
  policy: "Policy",
  exchange: "Exchange",
  data: "Data",
};
