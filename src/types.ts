export type Category = 'Chaulafan y Arroz' | 'Tallarines y Mixto' | 'Bebidas' | 'Bebidas Calientes' | 'Licor' | 'Combos Familiares' | 'Combos Ideales' | 'Porciones' | 'Salteados' | 'Plancha' | 'Especial' | 'Cremas y Sopas' | 'Jugos' | 'Apanados' | 'Entradas';

export type Role = 'Administrador' | 'Cajero' | 'Mesero';

export interface UserAccount {
  id: string;
  cedula: string;
  name: string;
  role: Role;
  password: string;
  branchId?: string;
  branchName?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: Category;
  price: number;
  cost: number;
  description?: string;
  isDrink?: boolean;
  isCombo?: boolean;
}

export interface CartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  printedQuantity?: number;
}

export interface Order {
  id: string;
  orderNumber: number;
  date: string;
  customerName: string;
  tableNumber: string;
  items: CartItem[];
  total: number;
  totalCost: number;
  profit: number;
  ivaRate?: number;
  sellerId?: string;
  sellerName?: string;
  status?: 'active' | 'voided';
  notes?: string;
  branchId?: string;
  branchName?: string;
}

export interface TableOrder {
  id: string; // matches tableNumber
  tableNumber: string;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
  updatedAtTimestamp?: number;
  sellerId?: string;
  sellerName?: string;
  branchId?: string;
  branchName?: string;
  notes?: string;
  customerName?: string;
}

export interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  stock: number; // Stock principal (Matriz / Sucursal 1)
  stocks?: Record<string, number>; // Stock por sucursal: { '1': number, '2': number }
  stock_sucursal2?: number; // Stock específico para Sucursal 2 (San Rafael)
  unitCost: number;
}

export interface RecipeIngredient {
  rawMaterialId: string;
  quantity: number;
}

export interface Dish {
  id: string;
  name: string;
  category: Category;
  price: number;
  ingredients: RecipeIngredient[];
}

export interface Drink {
  id: string;
  name: string;
  category: Category;
  price: number;
  stock: number; // Stock principal (Matriz / Sucursal 1)
  stocks?: Record<string, number>; // Stock por sucursal: { '1': number, '2': number }
  stock_sucursal2?: number; // Stock específico para Sucursal 2 (San Rafael)
  unitCost: number;
}

// Función utilitaria para resolver el stock de cualquier producto según la sucursal
export function getStockForBranch(
  item: { stock?: number; stocks?: Record<string, number>; stock_sucursal2?: number },
  branchId: string = '1'
): number {
  if (!item) return 0;
  if (branchId === '2') {
    if (typeof item.stock_sucursal2 === 'number') {
      return item.stock_sucursal2;
    }
    if (item.stocks && typeof item.stocks['2'] === 'number') {
      return item.stocks['2'];
    }
    return 0;
  }
  // Matriz (Sucursal 1)
  if (item.stocks && typeof item.stocks['1'] === 'number') {
    return item.stocks['1'];
  }
  return typeof item.stock === 'number' ? item.stock : 0;
}

export interface ComboItem {
  type: 'dish' | 'drink';
  itemId: string;
  quantity: number;
}

export interface Combo {
  id: string;
  name: string;
  category: Category;
  price: number;
  items: ComboItem[];
}

