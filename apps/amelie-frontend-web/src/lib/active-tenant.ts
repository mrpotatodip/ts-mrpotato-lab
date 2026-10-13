import { z } from "zod";
import {
  getCookie,
  setCookie,
  deleteCookie,
} from "@tanstack/react-start/server";
import { TenantIdSchema, TenantSchema } from "@repo/contracts/amelie";
import { apiClient } from "#/lib/api-client";
import { apiResponseSchema } from "#/lib/api-response-schema";

const TENANT_COOKIE_NAME = "amelie_tenant_id";
const TENANT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

const TenantsResponseSchema = apiResponseSchema(z.array(TenantSchema));

// -----
// The Tenant the cookie remembers, if any. Never
// throws, so a login with no cafe can ask safely.
// -----
export function getRememberedTenantId(): string | null {
  const remembered = TenantIdSchema.safeParse(getCookie(TENANT_COOKIE_NAME));
  return remembered.success ? remembered.data : null;
}

// -----
// The cookie's Tenant, else the Person's first
// one, remembered until sign-in or sign-out.
// -----
export async function getActiveTenantId(): Promise<string> {
  const remembered = getRememberedTenantId();
  if (remembered) return remembered;

  const { data } = await apiClient.get("/tenants", TenantsResponseSchema);
  const first = data?.[0];
  if (!first) throw new Error("You are not a member of any café yet");

  setActiveTenantId(first.id);
  return first.id;
}

export function setActiveTenantId(tenantId: string): void {
  setCookie(TENANT_COOKIE_NAME, tenantId, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    path: "/",
    maxAge: TENANT_COOKIE_MAX_AGE,
  });
}

// -----
// Adds ?tenantId= to an engine path that
// may already carry a query string.
// -----
export async function withActiveTenant(path: string): Promise<string> {
  const tenantId = await getActiveTenantId();
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}tenantId=${encodeURIComponent(tenantId)}`;
}

export function clearActiveTenant(): void {
  deleteCookie(TENANT_COOKIE_NAME);
}
