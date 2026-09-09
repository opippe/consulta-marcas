export class PublicApiError extends Error {
  constructor(message: string, readonly code?: string, readonly retryAfterSeconds = 0) { super(message); }
}

export function apiError(response: Response, payload: { error?: string; code?: string; retryAfterSeconds?: number }, fallback: string) {
  const raw = Number(payload.retryAfterSeconds ?? response.headers.get("Retry-After"));
  const wait = response.status === 429 ? (Number.isFinite(raw) && raw > 0 ? Math.min(Math.ceil(raw), 86400) : 60) : 0;
  const message = payload.error || fallback;
  return new PublicApiError(wait ? `${message} Tente novamente em ${wait < 60 ? `${wait} segundos` : `${Math.ceil(wait / 60)} minuto(s)`}.` : message, payload.code, wait);
}
