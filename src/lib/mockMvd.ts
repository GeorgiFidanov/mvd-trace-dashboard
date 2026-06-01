export const mockIds = {
  assetId: "asset-1",
  offerId: "bWVtYmVyLWFuZC1wY2YtZGVm:YXNzZXQtMQ==:mock-offer",
  negotiationId: "mock-negotiation-1",
  agreementId: "mock-agreement-1",
  transferId: "mock-transfer-1",
  dataflowId: "mock-transfer-1",
  accessToken: "mocked-access-token-for-dashboard-only",
};

export function mockCatalog() {
  return {
    "@context": ["https://w3id.org/edc/connector/management/v2"],
    "@type": "Catalog",
    dataset: [
      {
        "@id": mockIds.assetId,
        "@type": "dcat:Dataset",
        id: mockIds.assetId,
        description: "Mock MVD asset requiring Membership and non-critical Manufacturer credentials.",
        hasPolicy: [
          {
            "@id": mockIds.offerId,
            "@type": "odrl:Offer",
            obligation: {
              action: "use",
              constraint: {
                leftOperand: "ManufacturerCredential.part_types",
                operator: "eq",
                rightOperand: "non_critical",
              },
            },
          },
        ],
        distribution: [{ format: "application/json" }],
      },
      {
        "@id": "asset-2",
        "@type": "dcat:Dataset",
        id: "asset-2",
        description: "Mock restricted asset that would terminate negotiation in MVD.",
        hasPolicy: [{ "@id": "mock-offer-asset-2", "@type": "odrl:Offer" }],
      },
    ],
    service: {
      endpointUrl: "http://controlplane.provider.svc.cluster.local:8082/api/dsp/2025-1",
      endpointDescription: "dspace:connector",
    },
  };
}

export function mockNegotiation() {
  return {
    "@id": mockIds.negotiationId,
    "@type": "ContractNegotiation",
    state: "FINALIZED",
    contractAgreementId: mockIds.agreementId,
  };
}

export function mockTransfer() {
  return {
    "@id": mockIds.transferId,
    "@type": "TransferProcess",
    state: "STARTED",
  };
}

export function mockDataflow() {
  return {
    endpointType: "http",
    endpoint: "http://dataplane.provider.svc.cluster.local:11002/api/public/mock/data/source",
    endpointProperties: [
      { name: "access_token", value: mockIds.accessToken },
      { name: "https://w3id.org/edc/v0.0.1/ns/type", value: "http" },
      {
        name: "https://w3id.org/edc/v0.0.1/ns/endpoint",
        value: "http://dataplane.provider.svc.cluster.local:11002/api/public/mock/data/source",
      },
    ],
  };
}

export function mockOpenDataflows() {
  return {
    [mockIds.dataflowId]: mockDataflow(),
  };
}

export function mockFinalData() {
  return [
    {
      id: "part-001",
      name: "demo non-critical component",
      dataspace: "MinimumViableDataspace",
      source: "mock",
    },
  ];
}
