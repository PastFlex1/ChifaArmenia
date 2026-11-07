import { increment } from 'firebase/firestore';
import { getStockForBranch } from '../types';

/**
 * Construye la escritura de stock de un producto para una sucursal.
 *
 * Usa `increment(delta)` en lugar de escribir el valor absoluto calculado en este equipo:
 * así dos computadoras que venden al mismo tiempo SUMAN sus descuentos en vez de pisarse
 * (antes la última escritura ganaba y se perdía el descuento de la otra venta).
 *
 * Solo se escribe la clave de la sucursal propia dentro de `stocks` (set con merge hace
 * mezcla profunda), para no sobrescribir el stock de la otra sucursal con un valor viejo.
 */
export function buildStockDeltaPayload(
  original: { stock?: number; stocks?: Record<string, number>; stock_sucursal2?: number } | undefined,
  newStock: number,
  branchId: string
): Record<string, any> | null {
  const origStock = original ? getStockForBranch(original, branchId) : 0;
  const delta = Math.round((newStock - origStock) * 1000) / 1000;
  if (delta === 0) return null;

  const key = branchId === '2' ? '2' : '1';
  const primaryField = key === '2' ? 'stock_sucursal2' : 'stock';
  const hasPrimary = typeof (original as any)?.[primaryField] === 'number';
  const hasMapValue = typeof original?.stocks?.[key] === 'number';

  return {
    // Si el campo aún no existe, se inicializa con el valor calculado (incrementar desde 0 sería incorrecto)
    [primaryField]: hasPrimary ? increment(delta) : newStock,
    stocks: { [key]: hasMapValue ? increment(delta) : newStock }
  };
}
