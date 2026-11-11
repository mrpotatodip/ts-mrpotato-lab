export type NewRunner = {
  tenantId: string;
  actorUserId: string;
  name: string;
  codeHash: string;
  expiresAt: Date;
};

export type NewRunnerJob = {
  scanId: string;
  tenantId: string;
  runnerId: string;
  repoUrl: string;
  ref: string | null;
  prompt: string;
  optionsJson: string;
  priorsJson: string;
};

export type JobReport = {
  scanId: string;
  runnerId: string;
  state: "succeeded" | "failed";
  error: string | null;
  commitSha: string | null;
  branch: string | null;
  usageJson: string | null;
  filesJson: string | null;
  now: Date;
};

export type PairingClaim = {
  codeHash: string;
  tokenHash: string;
  now: Date;
};
