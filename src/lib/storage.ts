import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { defaultConfig } from "./mvdFlow";
import type { MvdConfig, Trace, TraceEvent, TraceEventStatus, TraceStatus, TraceWithEvents } from "./types";

type TracePatch = Partial<
  Pick<
    Trace,
    | "assetId"
    | "contractOfferId"
    | "contractNegotiationId"
    | "contractAgreementId"
    | "transferProcessId"
    | "edrId"
    | "status"
  >
>;

let db: DatabaseSync | undefined;

export function getDb() {
  if (!db) {
    const dataDir = path.join(process.cwd(), "data");
    mkdirSync(dataDir, { recursive: true });
    db = new DatabaseSync(path.join(dataDir, "mvd-traces.sqlite"));
    db.exec(`
      CREATE TABLE IF NOT EXISTS traces (
        id TEXT PRIMARY KEY,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        assetId TEXT,
        contractOfferId TEXT,
        contractNegotiationId TEXT,
        contractAgreementId TEXT,
        transferProcessId TEXT,
        edrId TEXT,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS trace_events (
        id TEXT PRIMARY KEY,
        traceId TEXT NOT NULL,
        stepName TEXT NOT NULL,
        actor TEXT NOT NULL,
        target TEXT NOT NULL,
        method TEXT NOT NULL,
        url TEXT NOT NULL,
        requestHeadersRedacted TEXT NOT NULL,
        requestBody TEXT,
        responseStatus INTEGER,
        responseBody TEXT,
        extractedIds TEXT NOT NULL,
        status TEXT NOT NULL,
        errorMessage TEXT,
        startedAt TEXT NOT NULL,
        completedAt TEXT,
        durationMs INTEGER,
        FOREIGN KEY(traceId) REFERENCES traces(id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  return db;
}

export function createTrace(initial: TracePatch = {}) {
  const now = new Date().toISOString();
  const trace: Trace = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    assetId: initial.assetId ?? null,
    contractOfferId: initial.contractOfferId ?? null,
    contractNegotiationId: initial.contractNegotiationId ?? null,
    contractAgreementId: initial.contractAgreementId ?? null,
    transferProcessId: initial.transferProcessId ?? null,
    edrId: initial.edrId ?? null,
    status: initial.status ?? "running",
  };

  getDb()
    .prepare(
      `INSERT INTO traces
      (id, createdAt, updatedAt, assetId, contractOfferId, contractNegotiationId, contractAgreementId, transferProcessId, edrId, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      trace.id,
      trace.createdAt,
      trace.updatedAt,
      trace.assetId,
      trace.contractOfferId,
      trace.contractNegotiationId,
      trace.contractAgreementId,
      trace.transferProcessId,
      trace.edrId,
      trace.status,
    );

  return trace;
}

export function updateTrace(id: string, patch: TracePatch) {
  const current = getTrace(id);
  if (!current) throw new Error(`Trace ${id} not found`);
  const next: Trace = {
    ...current,
    assetId: patch.assetId === undefined ? current.assetId : patch.assetId,
    contractOfferId: patch.contractOfferId === undefined ? current.contractOfferId : patch.contractOfferId,
    contractNegotiationId:
      patch.contractNegotiationId === undefined ? current.contractNegotiationId : patch.contractNegotiationId,
    contractAgreementId:
      patch.contractAgreementId === undefined ? current.contractAgreementId : patch.contractAgreementId,
    transferProcessId: patch.transferProcessId === undefined ? current.transferProcessId : patch.transferProcessId,
    edrId: patch.edrId === undefined ? current.edrId : patch.edrId,
    status: patch.status === undefined ? current.status : patch.status,
    updatedAt: new Date().toISOString(),
  };

  getDb()
    .prepare(
      `UPDATE traces SET
        updatedAt = ?, assetId = ?, contractOfferId = ?, contractNegotiationId = ?, contractAgreementId = ?,
        transferProcessId = ?, edrId = ?, status = ?
      WHERE id = ?`,
    )
    .run(
      next.updatedAt,
      next.assetId,
      next.contractOfferId,
      next.contractNegotiationId,
      next.contractAgreementId,
      next.transferProcessId,
      next.edrId,
      next.status,
      id,
    );

  return next;
}

export function addTraceEvent(event: Omit<TraceEvent, "id">) {
  const row: TraceEvent = { ...event, id: randomUUID() };
  getDb()
    .prepare(
      `INSERT INTO trace_events
      (id, traceId, stepName, actor, target, method, url, requestHeadersRedacted, requestBody, responseStatus,
        responseBody, extractedIds, status, errorMessage, startedAt, completedAt, durationMs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.id,
      row.traceId,
      row.stepName,
      row.actor,
      row.target,
      row.method,
      row.url,
      JSON.stringify(row.requestHeadersRedacted),
      JSON.stringify(row.requestBody),
      row.responseStatus,
      JSON.stringify(row.responseBody),
      JSON.stringify(row.extractedIds),
      row.status,
      row.errorMessage,
      row.startedAt,
      row.completedAt,
      row.durationMs,
    );
  return row;
}

export function getTrace(id: string): Trace | null {
  const row = getDb().prepare("SELECT * FROM traces WHERE id = ?").get(id) as DbTrace | undefined;
  return row ? mapTrace(row) : null;
}

export function getTraceWithEvents(id: string): TraceWithEvents | null {
  const trace = getTrace(id);
  if (!trace) return null;
  return { ...trace, events: getTraceEvents(id) };
}

export function listTraces(limit = 20) {
  return (getDb().prepare("SELECT * FROM traces ORDER BY createdAt DESC LIMIT ?").all(limit) as DbTrace[]).map(mapTrace);
}

export function getTraceEvents(traceId: string) {
  return (
    getDb().prepare("SELECT * FROM trace_events WHERE traceId = ? ORDER BY startedAt ASC").all(traceId) as DbEvent[]
  ).map(mapEvent);
}

export function getConfig(): MvdConfig {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get("mvdConfig") as { value: string } | undefined;
  return row ? { ...defaultConfig, ...JSON.parse(row.value) } : defaultConfig;
}

export function saveConfig(config: MvdConfig) {
  getDb()
    .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
    .run("mvdConfig", JSON.stringify(config));
  return config;
}

type DbTrace = Omit<Trace, "status"> & { status: TraceStatus };
type DbEvent = Omit<
  TraceEvent,
  "requestHeadersRedacted" | "requestBody" | "responseBody" | "extractedIds" | "status"
> & {
  requestHeadersRedacted: string;
  requestBody: string | null;
  responseBody: string | null;
  extractedIds: string;
  status: TraceEventStatus;
};

function mapTrace(row: DbTrace): Trace {
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    assetId: row.assetId,
    contractOfferId: row.contractOfferId,
    contractNegotiationId: row.contractNegotiationId,
    contractAgreementId: row.contractAgreementId,
    transferProcessId: row.transferProcessId,
    edrId: row.edrId,
    status: row.status,
  };
}

function mapEvent(row: DbEvent): TraceEvent {
  return {
    ...row,
    requestHeadersRedacted: JSON.parse(row.requestHeadersRedacted),
    requestBody: row.requestBody ? JSON.parse(row.requestBody) : null,
    responseBody: row.responseBody ? JSON.parse(row.responseBody) : null,
    extractedIds: JSON.parse(row.extractedIds),
  };
}
