import { z } from "zod";

import { EMPTY_STORED_PICK, type StoredDashboardPick } from "./resolve-dashboard-scope";

const PREFIX = "amelie:dashboard-scope:";

const StoredDashboardPickSchema = z.object({
  countryId: z.string().nullable(),
  locationId: z.string().nullable(),
});

const listeners = new Set<() => void>();

type DashboardScopeCache = {
  tenantId: string;
  raw: string;
  value: StoredDashboardPick;
};

let cache: DashboardScopeCache = {
  tenantId: "",
  raw: "",
  value: EMPTY_STORED_PICK,
};

function storageKey(tenantId: string): string {
  return `${PREFIX}${tenantId}`;
}

function parseStoredDashboardPick(raw: string | null): StoredDashboardPick {
  if (!raw) return EMPTY_STORED_PICK;
  try {
    const parsed = StoredDashboardPickSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY_STORED_PICK;
  } catch {
    return EMPTY_STORED_PICK;
  }
}

function readRaw(tenantId: string): string {
  if (!tenantId) return "";
  try {
    return globalThis.sessionStorage?.getItem(storageKey(tenantId)) ?? "";
  } catch {
    return "";
  }
}

export function readDashboardScope(tenantId: string): StoredDashboardPick {
  const raw = readRaw(tenantId);
  if (cache.tenantId === tenantId && cache.raw === raw) return cache.value;
  const value = parseStoredDashboardPick(raw || null);
  cache = { tenantId, raw, value };
  return value;
}

export function writeDashboardScope(tenantId: string, pick: StoredDashboardPick): void {
  if (!tenantId) return;
  const raw = JSON.stringify(pick);
  try {
    globalThis.sessionStorage?.setItem(storageKey(tenantId), raw);
  } catch {
    return;
  }
  cache = { tenantId, raw, value: pick };
  listeners.forEach((listener) => listener());
}

export function subscribeDashboardScope(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getDashboardScopeServerSnapshot(): StoredDashboardPick {
  return EMPTY_STORED_PICK;
}
