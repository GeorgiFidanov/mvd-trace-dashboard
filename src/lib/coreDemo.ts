/** DS4SSCC Show & Tell Playbook — Section 2: Core Demo (5 steps). */

export type CoreDemoStage = {
  stage: number;
  id: string;
  title: string;
  shortTitle: string;
  playbookTiming: string;
  showAndDescribe: string[];
  buildingBlocks: string[];
  responsibleActor: string;
  whatUserSees: string;
  wizardStepId: string;
};

export const CORE_DEMO_USE_CASE_ID = "UC-CORE";

export const coreDemoStages: CoreDemoStage[] = [
  {
    stage: 1,
    id: "core-onboard",
    title: "Onboard a Participant",
    shortTitle: "Onboard",
    playbookTiming: "2–3 min",
    showAndDescribe: [
      "Registration / identity creation",
      "Trust validation (governance)",
      "Connector or endpoint registration",
    ],
    buildingBlocks: ["Participants & Roles", "Identity & Trust", "Governance"],
    responsibleActor: "Participant with Governance / Trust",
    whatUserSees: "The participant appears registered and ready to join a trusted dataspace exchange.",
    wizardStepId: "core-onboard",
  },
  {
    stage: 2,
    id: "core-publish",
    title: "Create / Publish a Data Offer",
    shortTitle: "Publish",
    playbookTiming: "2–3 min",
    showAndDescribe: [
      "Dataset → data product",
      "Metadata and policy definition",
      "Publication in the catalog",
      "Removing or updating a data offer",
    ],
    buildingBlocks: ["Data Offering", "Data Catalog", "Usage Control"],
    responsibleActor: "Provider",
    whatUserSees: "Published data products appear in the catalog with clear usage rules attached.",
    wizardStepId: "core-publish",
  },
  {
    stage: 3,
    id: "core-request-access",
    title: "Request Data Access",
    shortTitle: "Request",
    playbookTiming: "2–3 min",
    showAndDescribe: [
      "Discovery in the catalog",
      "Access request and agreement",
      "Policy application",
    ],
    buildingBlocks: ["Usage Control", "Governance", "Identity & Trust"],
    responsibleActor: "Consumer with Provider approval",
    whatUserSees: "The consumer selects a data product and sees whether access is granted under policy.",
    wizardStepId: "core-request-access",
  },
  {
    stage: 4,
    id: "core-access-data",
    title: "Access & Use Data",
    shortTitle: "Use data",
    playbookTiming: "2–3 min",
    showAndDescribe: [
      "Secure data exchange",
      "Enforcement of policies",
      "Integration in an application or dashboard",
    ],
    buildingBlocks: ["Data Exchange", "Usage Control"],
    responsibleActor: "Consumer with Platform",
    whatUserSees: "Access is granted and the requested data appears through a controlled exchange path.",
    wizardStepId: "core-access-data",
  },
  {
    stage: 5,
    id: "core-offboard",
    title: "Offboard / Revoke Access",
    shortTitle: "Offboard",
    playbookTiming: "2–3 min",
    showAndDescribe: [
      "Offboarding: unsubscribing or removing an account",
      "Process for revocation of data access",
    ],
    buildingBlocks: ["Governance", "Participation Management"],
    responsibleActor: "Governance / Trust with Provider control",
    whatUserSees: "Access or trust is removed and a follow-up request would be denied.",
    wizardStepId: "core-offboard",
  },
];

export function isCoreDemoUseCase(useCaseId: string) {
  return useCaseId === CORE_DEMO_USE_CASE_ID;
}

export function coreDemoStageForWizardStep(wizardStepId: string) {
  return coreDemoStages.find((stage) => stage.wizardStepId === wizardStepId);
}
