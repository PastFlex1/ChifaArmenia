// Manejo de la hora de las ventas para no depender del reloj (posiblemente desfasado) de cada equipo.

const CLOCK_OFFSET_KEY = 'chifa_server_clock_offset_ms';
// Desfase a partir del cual se considera que el reloj del equipo está mal y se corrige la venta
export const CLOCK_SKEW_TOLERANCE_MS = 2 * 60 * 1000;

let serverClockOffsetMs = (() => {
  try {
    const raw = localStorage.getItem(CLOCK_OFFSET_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
})();

/** Hora actual estimada del servidor (reloj local + desfase medido). */
export function getServerNowMs(): number {
  return Date.now() + serverClockOffsetMs;
}

/** Registra el desfase medido entre el reloj del servidor y el de este equipo. */
export function setServerClockOffset(offsetMs: number): void {
  if (!Number.isFinite(offsetMs)) return;
  serverClockOffsetMs = Math.abs(offsetMs) < CLOCK_SKEW_TOLERANCE_MS ? 0 : offsetMs;
  try {
    localStorage.setItem(CLOCK_OFFSET_KEY, String(serverClockOffsetMs));
  } catch {
    // almacenamiento no disponible: el desfase solo vive en memoria
  }
}

/** Convierte createdAtServer (Timestamp de Firestore u objeto serializado) a milisegundos. */
export function serverTimestampToMs(value: any): number | null {
  if (!value) return null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
  return null;
}

/** Hora real de una venta: prioriza la hora del servidor y usa `date` como respaldo. */
export function getOrderTimeMs(order: { date: string; createdAtServer?: any }): number {
  const serverMs = serverTimestampToMs(order.createdAtServer);
  if (serverMs !== null) return serverMs;
  return new Date(order.date).getTime();
}
