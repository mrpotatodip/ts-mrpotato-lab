export type NewRunner = {
  tenantId: string;
  actorUserId: string;
  name: string;
  codeHash: string;
  expiresAt: Date;
};

export type PairingClaim = {
  codeHash: string;
  tokenHash: string;
  now: Date;
};
