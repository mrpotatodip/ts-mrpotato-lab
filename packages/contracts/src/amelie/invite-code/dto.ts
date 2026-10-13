import { z } from "zod";
import {
  INVITE_CODE_MAX_USES_DEFAULT,
  INVITE_CODE_MAX_USES_LIMIT,
  INVITE_CODE_NOTE_MAX,
} from "../constants";
import { INVITE_CODE_STATUS_VALUES } from "../enums";

// -----
// Requests: what the admin sends
// -----
export const InviteCodeIdSchema = z.uuid();

export const InviteCodeParamSchema = z.object({
  id: InviteCodeIdSchema,
});

export const CreateInviteCodeBodySchema = z.object({
  note: z.string().trim().max(INVITE_CODE_NOTE_MAX).default(""),
  maxUses: z.number().int().min(1).max(INVITE_CODE_MAX_USES_LIMIT).default(INVITE_CODE_MAX_USES_DEFAULT),
  expiresAt: z.iso
    .datetime()
    .refine((value) => new Date(value) > new Date(), "Must be in the future")
    .nullable()
    .default(null),
});

// -----
// Responses: a code as the list shows it. The
// code and its hash are never part of it.
// -----
export const InviteCodeSchema = z.object({
  id: InviteCodeIdSchema,
  note: z.string(),
  status: z.enum(INVITE_CODE_STATUS_VALUES),
  useCount: z.number().int(),
  maxUses: z.number().int(),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  revokedAt: z.iso.datetime().nullable(),
  createdByName: z.string(),
});

// -----
// Responses: the one time the plain code is
// shown, e.g. K7M2-9QXA-4TWB
// -----
export const CreatedInviteCodeSchema = z.object({
  code: z.string(),
  inviteCode: InviteCodeSchema,
});

export type InviteCodeParam = z.infer<typeof InviteCodeParamSchema>;
export type CreateInviteCodeBody = z.infer<typeof CreateInviteCodeBodySchema>;
export type InviteCode = z.infer<typeof InviteCodeSchema>;
export type CreatedInviteCode = z.infer<typeof CreatedInviteCodeSchema>;
