export type Category = 'Chaulafan y Arroz' | 'Tallarines y Mixto' | 'Bebidas' | 'Bebidas Calientes' | 'Licor' | 'Combos Familiares' | 'Combos Ideales' | 'Porciones' | 'Salteados' | 'Plancha' | 'Especial' | 'Cremas y Sopas' | 'Jugos' | 'Apanados' | 'Entradas';

export type Role = 'Administrador' | 'Cajero' | 'Mesero';

export interface UserAccount {
  id: string;
  cedula: string;
  name: string;
  role: Role;
  password: string;
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
}

export interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  stock: number;
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
  stock: number;
  unitCost: number;
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

