// -----
// This app's own public origin — used to build callbackURLs handed to
// better-auth (e.g. the email verification link) so it redirects back
// here instead of defaulting to the API's own origin, which has no
// route at "/" and would otherwise land the user on a bare 404.
// -----

export const APP_BASE_URL = import.meta.env.PROD
  ? "https://helloelise.app"
  : "http://localhost:3000";
