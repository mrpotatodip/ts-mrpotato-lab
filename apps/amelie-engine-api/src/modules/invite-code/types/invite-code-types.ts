// -----
// What the status is worked out from
// -----
export type InviteCodeStatusInput = {
  revokedAt: Date | null;
  expiresAt: Date | null;
  useCount: number;
  maxUses: number;
};

// -----
// What an insert needs: the hash, never the code
// -----
export type NewInviteCode = {
  note: string;
  maxUses: number;
  expiresAt: Date | null;
  codeHash: string;
  createdBy: string;
};
