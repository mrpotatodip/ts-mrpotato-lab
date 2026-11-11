// -----
// A GitHub answer that was not the one we needed. It carries the
// status, so a caller can tell "this install cannot see that repo"
// (404 or 422) from an outage (5xx) without reading the message.
// The message names the status and never a token or a key.
// -----
export class GithubHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GithubHttpError";
  }
}
