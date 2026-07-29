/**
 * HTTP status codes used by the GeoBov app when talking to CowTrackAPI.
 * Prefer these constants over magic numbers in services/interceptors.
 */
export enum HttpStatusCode {
  NetworkError = 0,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  Conflict = 409,
  UnprocessableEntity = 422,
  TooManyRequests = 429,
  InternalServerError = 500,
  BadGateway = 502,
  ServiceUnavailable = 503,
}
