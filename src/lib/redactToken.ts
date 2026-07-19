// Beeminder access tokens ride in request URLs (?access_token=...). Sentry's
// default integrations copy URLs into breadcrumbs and event.request.url, so
// scrub the token before anything is sent.
export const redactToken = (url: string): string =>
  url.replace(/access_token=[^&#]+/gi, "access_token=REDACTED");
