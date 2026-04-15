import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { HDNodeWallet, keccak256, toUtf8Bytes, Wallet } from "ethers";
import request from "supertest";
import { AppModule } from "../src/modules/app.module";

const domain = {
  name: "TerroirOS Trace",
  version: "1.0.0",
  chainId: 80002
};

const types = {
  BatchEvent: [
    { name: "eventId", type: "string" },
    { name: "batchId", type: "string" },
    { name: "eventType", type: "string" },
    { name: "issuerId", type: "string" },
    { name: "timestamp", type: "string" },
    { name: "payloadHash", type: "bytes32" },
    { name: "prevEventHash", type: "bytes32" }
  ]
};

describe("TerroirOS Trace E2E", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("supports happy-path trace creation for a Georgian wine batch", async () => {
    const wallet = Wallet.createRandom();
    await createProducerBatchAndIssuer(app, wallet, true, ["WINERY_OPERATOR"]);

    const eventTypes = [
      "BATCH_CREATED",
      "HARVEST_RECORDED",
      "PROCESSING_RECORDED",
      "BOTTLING_RECORDED",
      "SHIPMENT_RECORDED"
    ];
    for (const [index, eventType] of eventTypes.entries()) {
      const body = await buildSignedEvent(wallet, {
        eventId: `event-000${index + 1}`,
        eventType
      });
      await request(app.getHttpServer()).post("/events").send(body).expect(201);
    }

    const verify = await request(app.getHttpServer())
      .get("/verification/demo-batch-001")
      .expect(200);
    expect(verify.body.completeLifecycle).toBe(true);
    expect(verify.body.trustedIssuersOnly).toBe(true);
    expect(verify.body.signaturesValid).toBe(true);
  });

  it("rejects tampered attestations with invalid signatures", async () => {
    const wallet = Wallet.createRandom();
    await createProducerBatchAndIssuer(app, wallet, true, ["WINERY_OPERATOR"]);
    const event = (await buildSignedEvent(wallet, {
      eventId: "tampered-event-1",
      eventType: "BATCH_CREATED"
    })) as { payload: Record<string, unknown> };
    event.payload.harvestDate = "2020-01-01";
    await request(app.getHttpServer()).post("/events").send(event).expect(403);
  });

  it("surfaces untrusted issuer in verification summary", async () => {
    const wallet = Wallet.createRandom();
    await createProducerBatchAndIssuer(app, wallet, false, ["WINERY_OPERATOR"]);
    const event = await buildSignedEvent(wallet, {
      eventId: "event-untrusted-1",
      eventType: "BATCH_CREATED"
    });
    await request(app.getHttpServer()).post("/events").send(event).expect(201);
    const verify = await request(app.getHttpServer())
      .get("/verification/demo-batch-001")
      .expect(200);
    expect(verify.body.trustedIssuersOnly).toBe(false);
  });

  it("marks lifecycle incomplete when required events are missing", async () => {
    const wallet = Wallet.createRandom();
    await createProducerBatchAndIssuer(app, wallet, true, ["WINERY_OPERATOR"]);
    const event = await buildSignedEvent(wallet, {
      eventId: "event-incomplete-1",
      eventType: "BATCH_CREATED"
    });
    await request(app.getHttpServer()).post("/events").send(event).expect(201);
    const verify = await request(app.getHttpServer())
      .get("/verification/demo-batch-001")
      .expect(200);
    expect(verify.body.completeLifecycle).toBe(false);
  });

  it("treats identical batch create requests as idempotent", async () => {
    const wallet = Wallet.createRandom();
    await request(app.getHttpServer())
      .post("/producers")
      .send({
        producerId: "producer-001",
        legalName: "Demo Winery",
        countryCode: "GE",
        region: "Kakheti",
        organizationWallet: wallet.address
      })
      .expect(201);

    const batch = {
      batchId: "demo-batch-001",
      producerId: "producer-001",
      productType: "Wine",
      varietalOrSubtype: "Saperavi",
      vineyardOrFarmLocation: "Telavi",
      harvestDate: "2025-09-12",
      schemaVersion: "1.0.0"
    };

    await request(app.getHttpServer()).post("/batches").send(batch).expect(201);
    await request(app.getHttpServer()).post("/batches").send(batch).expect(201);
  });

  it("rejects conflicting reuse of an existing batchId", async () => {
    const wallet = Wallet.createRandom();
    await createProducerBatchAndIssuer(app, wallet, true, ["WINERY_OPERATOR"]);

    await request(app.getHttpServer())
      .post("/batches")
      .send({
        batchId: "demo-batch-001",
        producerId: "producer-001",
        productType: "Wine",
        varietalOrSubtype: "Rkatsiteli",
        vineyardOrFarmLocation: "Telavi",
        harvestDate: "2025-09-12",
        schemaVersion: "1.0.0"
      })
      .expect(409);
  });

  it("rejects duplicate batches with different IDs but the same producer and harvest fingerprint", async () => {
    const wallet = Wallet.createRandom();
    await createProducerBatchAndIssuer(app, wallet, true, ["WINERY_OPERATOR"]);

    await request(app.getHttpServer())
      .post("/batches")
      .send({
        batchId: "demo-batch-002",
        producerId: "producer-001",
        productType: "wine",
        varietalOrSubtype: "saperavi",
        vineyardOrFarmLocation: "telavi",
        harvestDate: "2025-09-12",
        schemaVersion: "1.0.0"
      })
      .expect(409);
  });

  it("rejects unsupported batch schema versions", async () => {
    const wallet = Wallet.createRandom();
    await request(app.getHttpServer())
      .post("/producers")
      .send({
        producerId: "producer-001",
        legalName: "Demo Winery",
        countryCode: "GE",
        region: "Kakheti",
        organizationWallet: wallet.address
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/batches")
      .send({
        batchId: "demo-batch-001",
        producerId: "producer-001",
        productType: "Wine",
        varietalOrSubtype: "Saperavi",
        vineyardOrFarmLocation: "Telavi",
        harvestDate: "2025-09-12",
        schemaVersion: "2.0.0"
      })
      .expect(400);
  });
});

async function createProducerBatchAndIssuer(
  app: INestApplication,
  wallet: HDNodeWallet,
  trusted: boolean,
  roles: string[]
): Promise<void> {
  await request(app.getHttpServer())
    .post("/producers")
    .send({
      producerId: "producer-001",
      legalName: "Demo Winery",
      countryCode: "GE",
      region: "Kakheti",
      organizationWallet: wallet.address
    })
    .expect(201);

  await request(app.getHttpServer())
    .post("/batches")
    .send({
      batchId: "demo-batch-001",
      producerId: "producer-001",
      productType: "Wine",
      varietalOrSubtype: "Saperavi",
      vineyardOrFarmLocation: "Telavi",
      harvestDate: "2025-09-12",
      schemaVersion: "1.0.0"
    })
    .expect(201);

  await request(app.getHttpServer())
    .post("/issuers")
    .send({
      issuerId: "issuer-001",
      organizationName: "Demo Issuer",
      walletAddress: wallet.address,
      roles,
      trusted
    })
    .expect(201);
}

async function buildSignedEvent(
  wallet: HDNodeWallet,
  input: {
    eventId: string;
    eventType: string;
  }
): Promise<Record<string, unknown>> {
  const payload = {
    note: `${input.eventType} recorded for pilot flow`,
    location: "Kakheti"
  };
  const timestamp = new Date().toISOString();
  const payloadHash = keccak256(toUtf8Bytes(JSON.stringify(payload)));
  const message = {
    eventId: input.eventId,
    batchId: "demo-batch-001",
    eventType: input.eventType,
    issuerId: "issuer-001",
    timestamp,
    payloadHash,
    prevEventHash: `0x${"0".repeat(64)}`
  };
  const signature = await wallet.signTypedData(domain, types, message);
  return {
    schemaVersion: "1.0.0",
    eventId: input.eventId,
    batchId: "demo-batch-001",
    eventType: input.eventType,
    issuerId: "issuer-001",
    timestamp,
    payload,
    documentRefs: [],
    signature
  };
}
