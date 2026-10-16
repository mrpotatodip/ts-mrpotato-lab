export function toTeamJoinPath(token: string): string {
  return `/join/${token}`;
}

export function toTeamJoinUrl(origin: string, token: string): string {
  return `${origin}${toTeamJoinPath(token)}`;
}
