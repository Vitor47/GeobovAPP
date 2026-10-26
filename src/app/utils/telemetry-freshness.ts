import { environment } from "../../environments/environment";

/**
 * GeoBov timestamps are UTC. FastAPI often sends a naive value with no Z.
 * Without an offset, JavaScript would read that clock time in the phone zone.
 */
export function parseApiInstant(value?: string | null): number {
  if (!value) return Number.NaN;

  const trimmed = value.trim();
  if (!trimmed) return Number.NaN;

  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const normalized = hasZone ? trimmed : `${trimmed.replace(" ", "T")}Z`;
  return new Date(normalized).getTime();
}

/** Formats a past timestamp as a short relative phrase in Portuguese. */
export function formatTimeAgo(isoDate?: string | null, now = Date.now()): string {
  if (!isoDate) return "desconhecida";

  const then = parseApiInstant(isoDate);
  if (Number.isNaN(then)) return "desconhecida";

  const diffMs = Math.max(0, now - then);
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "agora";
  if (minutes === 1) return "há 1 minuto";
  if (minutes < 60) return `há ${minutes} minutos`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "há 1 hora";
  if (hours < 24) return `há ${hours} horas`;

  const days = Math.floor(hours / 24);
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

/**
 * Estimates when the next LoRa sample should arrive, based on last sample
 * + device transmission interval (default from environment).
 */
export function formatNextUpdateEta(
  lastSeenAt?: string | null,
  intervalMinutes = environment.defaultTransmissionIntervalMinutes,
  now = Date.now()
): string {
  if (!lastSeenAt || intervalMinutes < 1) {
    return `em aproximadamente ${intervalMinutes} minutos`;
  }

  const then = parseApiInstant(lastSeenAt);
  if (Number.isNaN(then)) {
    return `em aproximadamente ${intervalMinutes} minutos`;
  }

  const nextAt = then + intervalMinutes * 60_000;
  const remainingMs = nextAt - now;

  if (remainingMs <= 0) {
    return "aguardando próximo sinal";
  }

  const minutes = Math.ceil(remainingMs / 60_000);
  if (minutes <= 1) return "em aproximadamente 1 minuto";
  return `em aproximadamente ${minutes} minutos`;
}
