import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { TableOrder, CartItem, RawMaterial, Drink, Dish } from '../types';

const DRAFTS_STORAGE_KEY = 'chifa_active_tables_drafts';

export type SyncState = 'synced' | 'local_slow' | 'offline' | 'syncing';

export interface LatencyStatus {
  isOnline: boolean;
  isFast: boolean;
  latencyMs: number;
}

// Registro en memoria de timestamps en que las mesas fueron liberadas/cobradas
const freedTablesTimestamps: Record<string, number> = {};

export function markTableAsFreed(tableNumber: string): void {
  const normalized = tableNumber.trim();
  if (!normalized) return;
  freedTablesTimestamps[normalized] = Date.now();
  removeLocalDraft(normalized);
}

export function isTableFreed(tableNumber: string, orderTimestamp?: number): boolean {
  const normalized = tableNumber.trim();
  const freedAt = freedTablesTimestamps[normalized];
  if (!freedAt) return false;
  if (!orderTimestamp) return true;
  return orderTimestamp <= freedAt;
}

// Persistencia Local Instantánea (0ms)
export function saveLocalDraft(tableNumber: string, items: CartItem[], sellerId?: string, sellerName?: string): TableOrder {
  const normalized = tableNumber.trim();
  const drafts = getAllLocalDrafts();
  const existing = drafts[normalized];
  const nowMs = Date.now();
  
  const draftOrder: TableOrder = {
    id: normalized,
    tableNumber: normalized,
    items: [...items],
    createdAt: existing ? existing.createdAt : new Date(nowMs).toISOString(),
    updatedAt: new Date(nowMs).toISOString(),
    updatedAtTimestamp: nowMs,
    sellerId,
    sellerName
  };
  // Si la mesa se está modificando, remover cualquier marca de tiempo de liberación previa
  if (freedTablesTimestamps[normalized] && nowMs > freedTablesTimestamps[normalized]) {
    delete freedTablesTimestamps[normalized];
  }
  drafts[normalized] = draftOrder;
  try {
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
  } catch (e) {
    console.error('Error al guardar en localStorage:', e);
  }

  return draftOrder;
}

export function getLocalDraft(tableNumber: string): TableOrder | null {
  const drafts = getAllLocalDrafts();
  return drafts[tableNumber.trim()] || null;
}

export function removeLocalDraft(tableNumber: string): void {
  const normalized = tableNumber.trim();
  const drafts = getAllLocalDrafts();
  delete drafts[normalized];
  try {
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
  } catch (e) {
    console.error('Error al eliminar de localStorage:', e);
  }
}

export function getAllLocalDrafts(): Record<string, TableOrder> {
  try {
    const raw = localStorage.getItem(DRAFTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Error al leer localStorage:', e);
    return {};
  }
}

// Medidor de Latencia de Red (Fast < 1500ms)
export async function measureFirebaseLatency(timeoutMs = 1500): Promise<LatencyStatus> {
  if (!navigator.onLine) {
    return { isOnline: false, isFast: false, latencyMs: Infinity };
  }

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Petición ultrarrápida sin bloqueo de CORS (Google Connectivity Check)
    await fetch('https://www.gstatic.com/generate_204', {
      method: 'GET',
      mode: 'no-cors',
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timer);

    const latencyMs = Date.now() - startTime;
    const isFast = latencyMs < 1500;
    return { isOnline: true, isFast, latencyMs };
  } catch (e) {
    const latencyMs = Date.now() - startTime;
    return { isOnline: navigator.onLine, isFast: false, latencyMs };
  }
}

// Guardado de la Mesa en Firestore con cálculo de stock
export async function syncTableToFirestore(
  tableOrder: TableOrder,
  activeTables: TableOrder[],
  rawMaterials: RawMaterial[],
  drinks: Drink[],
  dishes: Dish[],
  combos: any[]
): Promise<boolean> {
  const syncStartTime = Date.now();

  // Validar si la mesa fue liberada/cobrada antes o durante la preparación de los datos
  if (isTableFreed(tableOrder.tableNumber, tableOrder.updatedAtTimestamp || syncStartTime)) {
    console.log(`[syncTableToFirestore] Sincronización ignorada: La mesa ${tableOrder.tableNumber} fue liberada/cobrada.`);
    return true;
  }

  try {
    const previousTable = activeTables.find(t => t.tableNumber === tableOrder.tableNumber);
    const oldItems = previousTable ? previousTable.items : [];
    const newItems = tableOrder.items;

    // Calcular cambio neto de stock
    const newRawMaterials = rawMaterials.map(rm => ({ ...rm }));
    const newDrinks = drinks.map(d => ({ ...d }));

    const processItems = (items: CartItem[], multiplier: number) => {
      items.forEach(cartItem => {
        if (cartItem.menuItem.isCombo) {
          const combo = combos.find(c => c.id === cartItem.menuItem.id);
          if (combo) {
            combo.items.forEach((cItem: any) => {
              if (cItem.type === 'drink') {
                const drinkIndex = newDrinks.findIndex(d => d.id === cItem.itemId);
                if (drinkIndex >= 0) {
                  newDrinks[drinkIndex].stock = Math.max(0, newDrinks[drinkIndex].stock - (cItem.quantity * cartItem.quantity * multiplier));
                }
              } else {
                const dish = dishes.find(d => d.id === cItem.itemId);
                if (dish) {
                   dish.ingredients?.forEach(ing => {
                     const rmIndex = newRawMaterials.findIndex(rm => rm.id === ing.rawMaterialId);
                     if (rmIndex >= 0) {
                       const newVal = newRawMaterials[rmIndex].stock - (ing.quantity * cItem.quantity * cartItem.quantity * multiplier);
                       newRawMaterials[rmIndex].stock = Math.max(0, Math.round(newVal * 1000) / 1000);
                     }
                   });
                }
              }
            });
          }
        } else if (cartItem.menuItem.isDrink) {
          const drinkIndex = newDrinks.findIndex(d => d.id === cartItem.menuItem.id);
          if (drinkIndex >= 0) {
            const newVal = newDrinks[drinkIndex].stock - (cartItem.quantity * multiplier);
            newDrinks[drinkIndex].stock = Math.max(0, Math.round(newVal * 1000) / 1000);
          }
        } else {
          const dish = dishes.find(d => d.id === cartItem.menuItem.id);
          if (dish) {
             dish.ingredients?.forEach(ing => {
               const rmIndex = newRawMaterials.findIndex(rm => rm.id === ing.rawMaterialId);
               if (rmIndex >= 0) {
                 const newVal = newRawMaterials[rmIndex].stock - (ing.quantity * cartItem.quantity * multiplier);
                 newRawMaterials[rmIndex].stock = Math.max(0, Math.round(newVal * 1000) / 1000);
               }
             });
          }
        }
      });
    };

    processItems(oldItems, -1); // Devolver stock antiguo
    processItems(newItems, 1);  // Descontar stock nuevo

    const batch = writeBatch(db);
    newRawMaterials.forEach((rm, index) => {
      if (rm.stock !== rawMaterials[index].stock) batch.update(doc(db, 'rawMaterials', rm.id), { stock: rm.stock });
    });
    newDrinks.forEach((drink, index) => {
      if (drink.stock !== drinks[index].stock) batch.update(doc(db, 'drinks', drink.id), { stock: drink.stock });
    });

    if (newItems.length === 0) {
      batch.delete(doc(db, 'active_tables', tableOrder.tableNumber));
    } else {
      // Verificación de seguridad justo antes del commit
      if (isTableFreed(tableOrder.tableNumber, syncStartTime)) {
        console.log(`[syncTableToFirestore] Commit cancelado: La mesa ${tableOrder.tableNumber} fue liberada/cobrada durante la sincronización.`);
        return true;
      }
      batch.set(doc(db, 'active_tables', tableOrder.tableNumber), tableOrder);
    }

    await batch.commit();
    return true;
  } catch (e) {
    console.error("Error sincronizando mesa con Firestore:", e);
    return false;
  }
}
