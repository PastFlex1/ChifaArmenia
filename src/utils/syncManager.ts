import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { TableOrder, CartItem, RawMaterial, Drink, Dish, Order } from '../types';

const DRAFTS_STORAGE_KEY = 'chifa_active_tables_drafts';

export type SyncState = 'synced' | 'local_slow' | 'offline' | 'syncing';

export interface LatencyStatus {
  isOnline: boolean;
  isFast: boolean;
  latencyMs: number;
}

// Registro en memoria de timestamps en que las mesas fueron liberadas/cobradas, separado por sucursal
const freedTablesTimestamps: Record<string, number> = {};

const getFreedKey = (tableNumber: string, branchId?: string) => `${branchId || '1'}_${tableNumber.trim().toLowerCase()}`;

export function markTableAsFreed(tableNumber: string, timestamp?: number, branchId?: string): void {
  const normalized = tableNumber.trim();
  if (!normalized) return;
  const ts = timestamp || Date.now();
  const key = getFreedKey(normalized, branchId);
  freedTablesTimestamps[key] = ts;
  removeLocalDraft(normalized, branchId);
}

export function isTableFreed(tableNumber: string, orderTimestamp?: number, branchId?: string): boolean {
  const normalized = tableNumber.trim().toLowerCase();
  const key = getFreedKey(normalized, branchId);
  const freedAt = freedTablesTimestamps[key];
  if (!freedAt) return false;
  if (!orderTimestamp) return true;
  return orderTimestamp <= freedAt;
}

// Persistencia Local Instantánea (0ms) con aislamiento por sucursal
export function saveLocalDraft(
  tableNumber: string, 
  items: CartItem[], 
  sellerId?: string, 
  sellerName?: string, 
  branchId: string = '1', 
  branchName?: string
): TableOrder | null {
  const normalized = tableNumber.trim();
  if (!normalized) return null;
  const effectiveBranchId = branchId || '1';
  const effectiveBranchName = branchName || (effectiveBranchId === '2' ? 'Sucursal 2' : 'Matriz');

  if (!items || items.length === 0) {
    removeLocalDraft(normalized, effectiveBranchId);
    return null;
  }

  const drafts = getAllLocalDrafts();
  const draftCompositeKey = `${effectiveBranchId}_${normalized.toLowerCase()}`;
  const existingKey = Object.keys(drafts).find(key => {
    const d = drafts[key];
    return (d.branchId || '1') === effectiveBranchId && d.tableNumber.trim().toLowerCase() === normalized.toLowerCase();
  });
  const existing = existingKey ? drafts[existingKey] : null;
  const nowMs = Date.now();
  
  const draftOrder: TableOrder = {
    id: `${effectiveBranchId}_${normalized}`,
    tableNumber: normalized,
    items: [...items],
    createdAt: existing ? existing.createdAt : new Date(nowMs).toISOString(),
    updatedAt: new Date(nowMs).toISOString(),
    updatedAtTimestamp: nowMs,
    sellerId,
    sellerName,
    branchId: effectiveBranchId,
    branchName: effectiveBranchName
  };

  const freedKey = getFreedKey(normalized, effectiveBranchId);
  if (freedTablesTimestamps[freedKey] && nowMs > freedTablesTimestamps[freedKey]) {
    delete freedTablesTimestamps[freedKey];
  }
  drafts[draftCompositeKey] = draftOrder;
  try {
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
  } catch (e) {
    console.error('Error al guardar en localStorage:', e);
  }

  return draftOrder;
}

export function getLocalDraft(tableNumber: string, branchId: string = '1'): TableOrder | null {
  const normalized = tableNumber.trim().toLowerCase();
  if (!normalized) return null;
  const effectiveBranchId = branchId || '1';
  const drafts = getAllLocalDrafts();
  const foundKey = Object.keys(drafts).find(key => {
    const d = drafts[key];
    return (d.branchId || '1') === effectiveBranchId && d.tableNumber.trim().toLowerCase() === normalized;
  });
  if (!foundKey) return null;
  const draft = drafts[foundKey];
  if (!draft) return null;

  // Si la mesa está liberada o la fecha del borrador es previa a la liberación, borrar borrador y retornar null
  if (isTableFreed(normalized, draft.updatedAtTimestamp, effectiveBranchId)) {
    removeLocalDraft(normalized, effectiveBranchId);
    return null;
  }
  return draft;
}

export function removeLocalDraft(tableNumber: string, branchId?: string): void {
  const normalized = tableNumber.trim().toLowerCase();
  if (!normalized) return;
  const drafts = getAllLocalDrafts();
  let changed = false;
  Object.keys(drafts).forEach(key => {
    const d = drafts[key];
    const matchTable = d.tableNumber?.trim().toLowerCase() === normalized || key.trim().toLowerCase() === normalized;
    const matchBranch = !branchId || (d.branchId || '1') === (branchId || '1');
    if (matchTable && matchBranch) {
      delete drafts[key];
      changed = true;
    }
  });
  if (changed) {
    try {
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    } catch (e) {
      console.error('Error al eliminar de localStorage:', e);
    }
  }
}

export function purgeDraftsForCompletedOrders(orders: Order[], currentBranchId?: string): void {
  if (!orders || orders.length === 0) return;
  const raw = localStorage.getItem(DRAFTS_STORAGE_KEY);
  if (!raw) return;
  let drafts: Record<string, TableOrder>;
  try {
    drafts = JSON.parse(raw);
  } catch {
    return;
  }
  const keys = Object.keys(drafts);
  if (keys.length === 0) return;

  const latestOrderByTableBranch: Record<string, number> = {};
  orders.forEach(order => {
    if (order.tableNumber) {
      const normTable = order.tableNumber.trim().toLowerCase();
      if (normTable !== 'para llevar' && normTable !== 'llevar' && normTable !== 'domicilio') {
        const oBranch = order.branchId || '1';
        const key = `${oBranch}_${normTable}`;
        const orderMs = new Date(order.date).getTime();
        if (!latestOrderByTableBranch[key] || orderMs > latestOrderByTableBranch[key]) {
          latestOrderByTableBranch[key] = orderMs;
        }
      }
    }
  });

  let changed = false;
  keys.forEach(key => {
    const draft = drafts[key];
    const dBranch = draft.branchId || '1';
    if (currentBranchId && dBranch !== currentBranchId) return;

    const normKey = (draft.tableNumber || key).trim().toLowerCase();
    const orderKey = `${dBranch}_${normKey}`;
    const orderMs = latestOrderByTableBranch[orderKey];
    if (orderMs) {
      const draftMs = draft.updatedAtTimestamp || (draft.updatedAt ? new Date(draft.updatedAt).getTime() : 0);
      if (orderMs >= draftMs - 60000) {
        delete drafts[key];
        freedTablesTimestamps[getFreedKey(normKey, dBranch)] = orderMs;
        changed = true;
      }
    } else if (isTableFreed(normKey, draft.updatedAtTimestamp, dBranch)) {
      delete drafts[key];
      changed = true;
    }
  });

  if (changed) {
    try {
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    } catch (e) {
      console.error('Error al purgar borradores obsoletos:', e);
    }
  }
}

export function getAllLocalDrafts(): Record<string, TableOrder> {
  try {
    const raw = localStorage.getItem(DRAFTS_STORAGE_KEY);
    if (!raw) return {};
    const drafts: Record<string, TableOrder> = JSON.parse(raw);
    
    let changed = false;
    Object.keys(drafts).forEach(key => {
      const draft = drafts[key];
      const normKey = key.trim().toLowerCase();
      if (isTableFreed(normKey, draft?.updatedAtTimestamp)) {
        delete drafts[key];
        changed = true;
      }
    });

    if (changed) {
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    }

    return drafts;
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
  combos: any[],
  orders: Order[] = []
): Promise<boolean> {
  if (!tableOrder || !tableOrder.tableNumber) return true;
  const normalizedTable = tableOrder.tableNumber.trim();
  const branchId = tableOrder.branchId || '1';
  const syncStartTime = Date.now();
  const draftTime = tableOrder.updatedAtTimestamp || syncStartTime;

  // Si el borrador no tiene items, no escribirlo en active_tables
  if (!tableOrder.items || tableOrder.items.length === 0) {
    removeLocalDraft(normalizedTable, branchId);
    return true;
  }

  // Validar si la mesa fue liberada/cobrada antes o durante la preparación de los datos
  if (isTableFreed(normalizedTable, draftTime, branchId)) {
    console.log(`[syncTableToFirestore] Sincronización ignorada: La mesa ${normalizedTable} (Sucursal ${branchId}) fue liberada/cobrada.`);
    removeLocalDraft(normalizedTable, branchId);
    return true;
  }

  // Verificar si existe una nota de venta (order) reciente para esta mesa EN LA MISMA SUCURSAL
  if (orders && orders.length > 0) {
    const tableOrders = orders.filter(o => 
      (o.branchId || '1') === branchId && 
      o.tableNumber && 
      o.tableNumber.trim().toLowerCase() === normalizedTable.toLowerCase()
    );
    if (tableOrders.length > 0) {
      tableOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestOrder = tableOrders[0];
      const orderTime = new Date(latestOrder.date).getTime();
      
      if (orderTime >= draftTime - 60000) {
        console.log(`[syncTableToFirestore] Sincronización ignorada: Existe una nota de venta reciente para la mesa ${normalizedTable} en Sucursal ${branchId}. Borrando borrador obsoleto.`);
        removeLocalDraft(normalizedTable, branchId);
        return true; 
      }
    }
  }

  try {
    const previousTable = activeTables.find(t => 
      (t.branchId || '1') === branchId && 
      t.tableNumber.trim().toLowerCase() === normalizedTable.toLowerCase()
    );
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

    const docId = `${branchId}_${normalizedTable}`;
    if (newItems.length === 0) {
      batch.delete(doc(db, 'active_tables', docId));
      if (branchId === '1') {
        batch.delete(doc(db, 'active_tables', normalizedTable));
      }
    } else {
      // Verificación de seguridad justo antes del commit
      if (isTableFreed(normalizedTable, syncStartTime, branchId)) {
        console.log(`[syncTableToFirestore] Commit cancelado: La mesa ${normalizedTable} (Sucursal ${branchId}) fue liberada/cobrada durante la sincronización.`);
        return true;
      }
      batch.set(doc(db, 'active_tables', docId), {
        ...tableOrder,
        id: docId,
        branchId,
        branchName: tableOrder.branchName || (branchId === '2' ? 'Sucursal 2' : 'Matriz')
      });
      // Si existía con el ID sin prefijo heredado, limpiarlo para evitar duplicidad
      if (branchId === '2') {
        batch.delete(doc(db, 'active_tables', normalizedTable));
      }
    }

    await batch.commit();
    return true;
  } catch (e) {
    console.error("Error sincronizando mesa con Firestore:", e);
    return false;
  }
}
