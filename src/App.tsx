import { useState, useMemo, useEffect } from 'react';
import { ShoppingBag, Search, Plus, Minus, Trash2, User, UtensilsCrossed, LineChart, Users, LogOut, Store, Package, ChefHat, Wine, X, Layers, LayoutGrid, Printer } from 'lucide-react';
import { CATEGORIES } from './data';
import { Category, CartItem, Order, MenuItem, RawMaterial, Dish, Drink, UserAccount, TableOrder } from './types';
import { ReceiptModal } from './components/ReceiptModal';
import { MateriaPrimaView } from './components/MateriaPrimaView';
import { DrinkInventoryView } from './components/DrinkInventoryView';
import { DishInventoryView } from './components/DishInventoryView';
import { ComboInventoryView } from './components/ComboInventoryView';
import { SalesView } from './components/SalesView';
import { LoginView } from './components/LoginView';
import { UsersView } from './components/UsersView';
import { WelcomeModal } from './components/WelcomeModal';
import { LoadingScreen } from './components/LoadingScreen';
import { MesasView } from './components/MesasView';
import { db } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch, query, where, increment } from 'firebase/firestore';
import Swal from 'sweetalert2';

export default function App() {
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [currentView, setCurrentView] = useState<'pos' | 'materia_prima' | 'inv_comida' | 'inv_bebidas' | 'combos' | 'ventas' | 'usuarios' | 'mesas'>('pos');
  const [activeCategory, setActiveCategory] = useState<Category | 'Todos'>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeTables, setActiveTables] = useState<TableOrder[]>([]);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  
  // Mobile Cart State
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Optimization States
  const [timeRange, setTimeRange] = useState<'all' | 'day' | 'week' | 'year' | 'custom'>('day');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [orderCounter, setOrderCounter] = useState<number>(0);
  const [isHolidayIva, setIsHolidayIva] = useState<boolean>(false);
  const [cashReceived, setCashReceived] = useState<string>('');

  // Inventories State
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [combos, setCombos] = useState<any[]>([]);

  // Firebase Realtime Subscriptions
  useEffect(() => {
    let loadedState = { users: false, rm: false, dishes: false, drinks: false, combos: false, tables: false };

    const checkComplete = () => {
      if (Object.values(loadedState).every(Boolean)) {
        setTimeout(() => setIsDbLoaded(true), 1500); // 1.5s delay to show the nice loading animation
      }
    };

    const unsubUsers = onSnapshot(collection(db, 'users'), snapshot => {
      if (snapshot.empty) {
        setDoc(doc(db, 'users', '1'), { id: '1', cedula: '0923809529001', name: 'Admin Principal', role: 'Administrador', password: 'admin' });
      } else {
        setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserAccount)));
      }
      if (!loadedState.users) { loadedState.users = true; checkComplete(); }
    }, (error) => {
      console.error("Error fetching users:", error);
      if (!loadedState.users) { loadedState.users = true; checkComplete(); }
    });

    const unsubRM = onSnapshot(collection(db, 'rawMaterials'), snapshot => {
      setRawMaterials(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as RawMaterial)));
      if (!loadedState.rm) { loadedState.rm = true; checkComplete(); }
    }, (error) => {
      console.error("Error fetching rawMaterials:", error);
      if (!loadedState.rm) { loadedState.rm = true; checkComplete(); }
    });

    const unsubDishes = onSnapshot(collection(db, 'dishes'), snapshot => {
      setDishes(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Dish)));
      if (!loadedState.dishes) { loadedState.dishes = true; checkComplete(); }
    }, (error) => {
      console.error("Error fetching dishes:", error);
      if (!loadedState.dishes) { loadedState.dishes = true; checkComplete(); }
    });

    const unsubDrinks = onSnapshot(collection(db, 'drinks'), snapshot => {
      setDrinks(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Drink)));
      if (!loadedState.drinks) { loadedState.drinks = true; checkComplete(); }
    }, (error) => {
      console.error("Error fetching drinks:", error);
      if (!loadedState.drinks) { loadedState.drinks = true; checkComplete(); }
    });

    const unsubCombos = onSnapshot(collection(db, 'combos'), snapshot => {
      setCombos(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      if (!loadedState.combos) { loadedState.combos = true; checkComplete(); }
    }, (error) => {
      console.error("Error fetching combos:", error);
      if (!loadedState.combos) { loadedState.combos = true; checkComplete(); }
    });

    const unsubTables = onSnapshot(collection(db, 'active_tables'), snapshot => {
      setActiveTables(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TableOrder)));
      if (!loadedState.tables) { loadedState.tables = true; checkComplete(); }
    }, (error) => {
      console.error("Error fetching tables:", error);
      if (!loadedState.tables) { loadedState.tables = true; checkComplete(); }
    });

    const counterRef = doc(db, 'counters', 'orders');
    const unsubCounter = onSnapshot(counterRef, (docSnap: any) => {
      if (docSnap.exists()) {
        setOrderCounter(docSnap.data()?.count || 0);
      } else {
        setDoc(counterRef, { count: 0 });
      }
    });

    return () => {
      unsubUsers();
      unsubRM();
      unsubDishes();
      unsubDrinks();
      unsubCombos();
      unsubTables();
      unsubCounter();
    };
  }, []);

  // Dedicated Orders Listener with TimeRange Filtering
  useEffect(() => {
    let qOrders = collection(db, 'orders') as any;
    const now = new Date();
    
    if (timeRange === 'day') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      qOrders = query(collection(db, 'orders'), where('date', '>=', startOfDay.toISOString()));
    } else if (timeRange === 'week') {
      const currentDay = now.getDay();
      const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
      qOrders = query(collection(db, 'orders'), where('date', '>=', startOfWeek.toISOString()));
    } else if (timeRange === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      qOrders = query(collection(db, 'orders'), where('date', '>=', startOfYear.toISOString()));
    } else if (timeRange === 'custom') {
      if (customDateRange.start && customDateRange.end) {
        const [sYear, sMonth, sDay] = customDateRange.start.split('-').map(Number);
        const start = new Date(sYear, sMonth - 1, sDay);
        start.setHours(0, 0, 0, 0);
        const [eYear, eMonth, eDay] = customDateRange.end.split('-').map(Number);
        const end = new Date(eYear, eMonth - 1, eDay);
        end.setHours(23, 59, 59, 999);
        qOrders = query(collection(db, 'orders'), where('date', '>=', start.toISOString()), where('date', '<=', end.toISOString()));
      } else if (customDateRange.start) {
        const [sYear, sMonth, sDay] = customDateRange.start.split('-').map(Number);
        const start = new Date(sYear, sMonth - 1, sDay);
        start.setHours(0, 0, 0, 0);
        qOrders = query(collection(db, 'orders'), where('date', '>=', start.toISOString()));
      } else if (customDateRange.end) {
        const [eYear, eMonth, eDay] = customDateRange.end.split('-').map(Number);
        const end = new Date(eYear, eMonth - 1, eDay);
        end.setHours(23, 59, 59, 999);
        qOrders = query(collection(db, 'orders'), where('date', '<=', end.toISOString()));
      }
    }

    const unsubOrders = onSnapshot(qOrders, snapshot => {
      setOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order)));
    }, (error) => {
      console.error("Error fetching orders:", error);
    });

    return () => unsubOrders();
  }, [timeRange, customDateRange]);

  // Derived POS Items from Inventories
  const posItems: MenuItem[] = useMemo(() => {
    const d: MenuItem[] = dishes.map(dish => {
      let dishCost = 0;
      dish.ingredients.forEach(ing => {
        const rm = rawMaterials.find(r => r.id === ing.rawMaterialId);
        if (rm) {
          dishCost += ing.quantity * rm.unitCost;
        }
      });
      return {
        id: dish.id,
        name: dish.name,
        category: dish.category,
        price: dish.price,
        cost: dishCost,
        isDrink: false
      };
    });
    
    const bev: MenuItem[] = drinks.map(drink => ({
      id: drink.id,
      name: drink.name,
      category: drink.category,
      price: drink.price,
      cost: drink.unitCost,
      isDrink: true
    }));

    const c: MenuItem[] = combos.map(combo => {
      let comboCost = 0;
      combo.items.forEach((cItem: any) => {
        if (cItem.type === 'dish') {
          const d = dishes.find(dish => dish.id === cItem.itemId);
          if (d) {
            d.ingredients.forEach(ing => {
              const rm = rawMaterials.find(r => r.id === ing.rawMaterialId);
              if (rm) {
                comboCost += ing.quantity * rm.unitCost * cItem.quantity;
              }
            });
          }
        } else if (cItem.type === 'drink') {
          const dr = drinks.find(drink => drink.id === cItem.itemId);
          if (dr) {
            comboCost += dr.unitCost * cItem.quantity;
          }
        }
      });
      return {
        id: combo.id,
        name: combo.name,
        category: combo.category,
        price: combo.price,
        cost: comboCost,
        isCombo: true
      };
    });

    return [...d, ...bev, ...c];
  }, [dishes, drinks, rawMaterials, combos]);

  // Filter items based on category and search
  const filteredItems = useMemo(() => {
    return posItems.filter((item) => {
      let matchesCategory = false;
      if (activeCategory === 'Todos') {
        matchesCategory = true;
      } else if (activeCategory === 'Chaulafan y Arroz') {
        matchesCategory = item.category === 'Chaulafan y Arroz';
      } else if (activeCategory === 'Bebidas') {
        matchesCategory = item.isDrink === true;
      } else {
        matchesCategory = item.category === activeCategory;
      }

      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (item.description?.toLowerCase().includes(searchQuery.toLowerCase()));
      return searchQuery ? matchesSearch : matchesCategory;
    });
  }, [posItems, activeCategory, searchQuery]);

  const getMaxAvailable = (menuItem: MenuItem): number => {
    if (menuItem.isCombo) {
      const combo = combos.find(c => c.id === menuItem.id);
      if (!combo || !combo.items || combo.items.length === 0) return Infinity;
      
      let minAvailable = Infinity;
      combo.items.forEach((cItem: any) => {
        if (cItem.type === 'drink') {
          const d = drinks.find(dr => dr.id === cItem.itemId);
          if (d) {
             const available = Math.floor(d.stock / cItem.quantity);
             if (available < minAvailable) minAvailable = available;
          } else {
             minAvailable = 0;
          }
        } else {
          const dish = dishes.find(d => d.id === cItem.itemId);
          if (dish && dish.ingredients) {
            dish.ingredients.forEach(ing => {
               const rm = rawMaterials.find(r => r.id === ing.rawMaterialId);
               if (rm) {
                  const available = Math.floor(rm.stock / (ing.quantity * cItem.quantity));
                  if (available < minAvailable) minAvailable = available;
               } else {
                  minAvailable = 0;
               }
            });
          }
        }
      });
      return minAvailable;
    } else if (menuItem.isDrink) {
      const d = drinks.find(dr => dr.id === menuItem.id);
      return d ? d.stock : 0;
    } else {
      // Dish doesn't track strictly without ingredients. If no ingredients or it's just a dish without recipe recorded:
      const dish = dishes.find(d => d.id === menuItem.id);
      if (!dish || !dish.ingredients || dish.ingredients.length === 0) return Infinity;
      
      let minAvailable = Infinity;
      dish.ingredients.forEach(ing => {
        const rm = rawMaterials.find(r => r.id === ing.rawMaterialId);
        if (rm) {
           const available = Math.floor(rm.stock / ing.quantity);
           if (available < minAvailable) minAvailable = available;
        } else {
           minAvailable = 0;
        }
      });
      return minAvailable;
    }
  };

  // Cart operations
  const addToCart = (menuItem: MenuItem) => {
    const maxAvailable = getMaxAvailable(menuItem);
    
    setCart((prev) => {
      const existing = prev.find((item) => item.menuItem.id === menuItem.id);
      const currentQty = existing ? existing.quantity : 0;
      
      if (currentQty + 1 > maxAvailable) {
        Swal.fire({ title: 'Stock Insuficiente', text: `No hay suficiente stock para ${menuItem.name}. Stock disponible: ${maxAvailable}`, icon: 'warning', confirmButtonColor: '#000' });
        return prev;
      }
      
      if (existing) {
        return prev.map((item) =>
          item.menuItem.id === menuItem.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { id: Date.now().toString() + menuItem.id, menuItem, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => prev.map((item) => {
      if (item.id === id) {
        const newQuantity = Math.max(0, item.quantity + delta);
        if (delta > 0) {
           const maxAvailable = getMaxAvailable(item.menuItem);
           if (newQuantity > maxAvailable) {
             Swal.fire({ title: 'Stock Insuficiente', text: `No hay suficiente stock para ${item.menuItem.name}. Stock disponible: ${maxAvailable}`, icon: 'warning', confirmButtonColor: '#000' });
             return item;
           }
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const updateQuantityExact = (id: string, newQuantity: number | string) => {
    setCart((prev) => prev.map((item) => {
      if (item.id === id) {
        if (newQuantity === '') return { ...item, quantity: '' as any }; // Permitir borrar temporalmente
        const numQty = parseFloat(newQuantity as string);
        if (isNaN(numQty) || numQty < 0) return item;
        
        const maxAvailable = getMaxAvailable(item.menuItem);
        if (numQty > maxAvailable) {
             Swal.fire({ title: 'Stock Insuficiente', text: `No hay suficiente stock para ${item.menuItem.name}. Stock disponible: ${maxAvailable}`, icon: 'warning', confirmButtonColor: '#000' });
             return { ...item, quantity: maxAvailable };
        }
        return { ...item, quantity: numQty };
      }
      return item;
    }).filter(item => item.quantity !== 0)); // No eliminar si es string vacio todavia
  };

  const handleBlurQuantity = (id: string) => {
     setCart((prev) => prev.filter(item => {
        if (item.id === id && (item.quantity === '' || item.quantity <= 0)) {
           return false;
        }
        return true;
     }));
  };

  const clearCart = () => {
    setCart([]);
    setTableNumber('');
    setCashReceived('');
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.menuItem.price * item.quantity), 0);
  }, [cart]);

  const handleTableClick = (tNumber: string) => {
    const table = activeTables.find(t => t.tableNumber === tNumber);
    if (table) {
      setCart(table.items);
    } else {
      setCart([]);
    }
    setTableNumber(tNumber);
    setActiveTableId(tNumber);
    setCurrentView('pos');
  };

    const getNetStockChanges = (oldItems: CartItem[], newItems: CartItem[]) => {
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
                     dish.ingredients.forEach(ing => {
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
               dish.ingredients.forEach(ing => {
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
  
      processItems(oldItems, -1); // Devolver items viejos (+ stock)
      processItems(newItems, 1);  // Descontar items nuevos (- stock)
  
      return { newRawMaterials, newDrinks };
    };

    const handleSaveTable = async (customCart?: CartItem[] | any) => {
      const itemsToSave = Array.isArray(customCart) ? customCart : cart;
      if (itemsToSave.length === 0 || !activeTableId || isCheckingOut) return;
      setIsCheckingOut(true);
      
      const previousTable = activeTables.find(t => t.tableNumber === activeTableId);
      const oldItems = previousTable ? previousTable.items : [];
      
      const { newRawMaterials, newDrinks } = getNetStockChanges(oldItems, itemsToSave);
      
      const tableOrder: TableOrder = {
        id: activeTableId,
        tableNumber: activeTableId,
        items: [...itemsToSave],
        createdAt: previousTable ? previousTable.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sellerId: currentUser?.id,
        sellerName: currentUser?.name
      };

      const batch = writeBatch(db);
      newRawMaterials.forEach((rm, index) => {
        if (rm.stock !== rawMaterials[index].stock) batch.update(doc(db, 'rawMaterials', rm.id), { stock: rm.stock });
      });
      newDrinks.forEach((drink, index) => {
        if (drink.stock !== drinks[index].stock) batch.update(doc(db, 'drinks', drink.id), { stock: drink.stock });
      });
      batch.set(doc(db, 'active_tables', activeTableId), tableOrder);

      try {
        await batch.commit();
        Swal.fire({ title: 'Éxito', text: `Mesa ${activeTableId} guardada correctamente.`, icon: 'success', timer: 1500, showConfirmButton: false });
        clearCart();
        setActiveTableId(null);
        setCurrentView('mesas');
      } catch (e) {
        console.error("Error saving table:", e);
        Swal.fire({ title: 'Error', text: 'Error al guardar la mesa.', icon: 'error', confirmButtonColor: '#000' });
      } finally {
        setIsCheckingOut(false);
      }
    };

    const handleCheckout = async () => {
      if (cart.length === 0 || isCheckingOut) return;
      
      if (!tableNumber || tableNumber.trim() === '') {
        Swal.fire({
          title: 'Falta la Mesa',
          text: 'Por favor, escribe el número de mesa o "Para llevar" en el campo antes de cobrar.',
          icon: 'warning',
          confirmButtonColor: '#B91C1C'
        });
        return;
      }
      
      setIsCheckingOut(true);
  
      // Deduct stock logically
      const oldItems = activeTableId ? (activeTables.find(t => t.tableNumber === activeTableId)?.items || []) : [];
      // If we are checking out an active table, we must first REFUND its stock, then DEDUCT the final cart.
      // Wait, if we are checking out right from the active table, getting the diff between oldItems and cart will ensure
      // stock is perfectly deducted. Let's do getNetStockChanges(oldItems, cart) just like handleSaveTable!
      const { newRawMaterials, newDrinks } = getNetStockChanges(oldItems, cart);

    const totalCost = cart.reduce((sum, item) => sum + (item.menuItem.cost * item.quantity), 0);
    const profit = cartTotal - totalCost;
    
    const maxOrder = orders.reduce((max, o) => Math.max(max, o.orderNumber || 0), 0);
    const nextOrderNumber = Math.max(orderCounter, maxOrder) + 1;

    // Inherit the date from the active table if it exists, otherwise use current time
    const activeTable = activeTables.find(t => t.tableNumber === tableNumber || t.tableNumber === activeTableId);
    let orderDate = activeTable && activeTable.createdAt ? activeTable.createdAt : new Date().toISOString();

    const newOrder: Order = {
      id: Date.now().toString(),
      orderNumber: nextOrderNumber,
      date: orderDate,
      customerName: '', // Customer name has been removed
      tableNumber,
      items: [...cart],
      total: cartTotal,
      totalCost,
      profit,
      ivaRate: isHolidayIva ? 8 : 15,
      sellerId: currentUser?.id,
      sellerName: currentUser?.name,
      status: 'active'
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'counters', 'orders'), { count: increment(1) }, { merge: true });

    newRawMaterials.forEach((rm, index) => {
      if (rm.stock !== rawMaterials[index].stock) {
        batch.update(doc(db, 'rawMaterials', rm.id), { stock: rm.stock });
      }
    });

    newDrinks.forEach((drink, index) => {
      if (drink.stock !== drinks[index].stock) {
        batch.update(doc(db, 'drinks', drink.id), { stock: drink.stock });
      }
    });

    batch.set(doc(db, 'orders', newOrder.id), newOrder);
    if (activeTableId) {
      batch.delete(doc(db, 'active_tables', activeTableId));
    }

    try {
      await batch.commit();
      setOrderCounter(nextOrderNumber);
      setCompletedOrder(newOrder);
      clearCart();
      setActiveTableId(null);
    } catch (e) {
      console.error("Error confirming order:", e);
      Swal.fire({ title: 'Error', text: 'Error al confirmar el pedido. Revisa tu conexión.', icon: 'error', confirmButtonColor: '#000' });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleFreeTableWithoutCheckout = async () => {
    if (!activeTableId || isCheckingOut) return;
    
    const result = await Swal.fire({
      title: '¿Liberar mesa sin cobrar?',
      text: "Se cancelará el pedido actual y se devolverá el inventario. Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#B91C1C',
      cancelButtonColor: '#1A1A1A',
      confirmButtonText: 'Sí, liberar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;
    
    setIsCheckingOut(true);

    try {
      const previousTable = activeTables.find(t => t.tableNumber === activeTableId);
      const oldItems = previousTable ? previousTable.items : [];
      
      const { newRawMaterials, newDrinks } = getNetStockChanges(oldItems, []);
      
      const batch = writeBatch(db);
      newRawMaterials.forEach((rm, index) => {
        if (rm.stock !== rawMaterials[index].stock) batch.update(doc(db, 'rawMaterials', rm.id), { stock: rm.stock });
      });
      newDrinks.forEach((drink, index) => {
        if (drink.stock !== drinks[index].stock) batch.update(doc(db, 'drinks', drink.id), { stock: drink.stock });
      });
      batch.delete(doc(db, 'active_tables', activeTableId));
      
      await batch.commit();
      Swal.fire({ title: 'Éxito', text: `Mesa ${activeTableId} liberada.`, icon: 'success', timer: 1500, showConfirmButton: false });
      clearCart();
      setActiveTableId(null);
      setCurrentView('mesas');
    } catch (e) {
      console.error("Error freeing table:", e);
      Swal.fire({ title: 'Error', text: 'Error al liberar la mesa.', icon: 'error', confirmButtonColor: '#000' });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handlePrintPreview = () => {
    if (cart.length === 0) return;
    const totalCost = cart.reduce((sum, item) => sum + (item.menuItem.cost * item.quantity), 0);
    const mockOrder: Order = {
      id: 'preview-' + Date.now(),
      orderNumber: orderCounter + 1,
      date: new Date().toISOString(),
      customerName: '',
      tableNumber: tableNumber || 'S/N',
      items: [...cart],
      total: cartTotal,
      totalCost,
      profit: cartTotal - totalCost,
      ivaRate: isHolidayIva ? 8 : 15,
      sellerId: currentUser?.id,
      sellerName: currentUser?.name,
      status: 'active'
    };
    setCompletedOrder(mockOrder);
  };

  const handleCloseReceipt = () => {
    setCompletedOrder(null);
  };

  const handleVoidOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    if (order.status === 'voided') return;

    try {
      const batch = writeBatch(db);

      // We need local copies to track cumulative additions if multiple items use the same raw material
      const updatedMaterials = new Map<string, number>();
      const updatedDrinks = new Map<string, number>();

      order.items.forEach(cartItem => {
        if (cartItem.menuItem.isCombo) {
          const combo = combos.find(c => c.id === cartItem.menuItem.id);
          if (combo) {
            combo.items.forEach((cItem: any) => {
              if (cItem.type === 'drink') {
                const drink = drinks.find(d => d.id === cItem.itemId);
                if (drink) {
                   const current = updatedDrinks.get(drink.id) ?? drink.stock;
                   updatedDrinks.set(drink.id, current + (cItem.quantity * cartItem.quantity));
                }
              } else {
                const dish = dishes.find(d => d.id === cItem.itemId);
                if (dish) {
                   dish.ingredients.forEach(ing => {
                     const rm = rawMaterials.find(r => r.id === ing.rawMaterialId);
                     if (rm) {
                       const current = updatedMaterials.get(rm.id) ?? rm.stock;
                       updatedMaterials.set(rm.id, current + (ing.quantity * cItem.quantity * cartItem.quantity));
                     }
                   });
                }
              }
            });
          }
        } else if (cartItem.menuItem.isDrink) {
          const drink = drinks.find(d => d.id === cartItem.menuItem.id);
          if (drink) {
             const current = updatedDrinks.get(drink.id) ?? drink.stock;
             updatedDrinks.set(drink.id, current + cartItem.quantity);
          }
        } else {
          const dish = dishes.find(d => d.id === cartItem.menuItem.id);
          if (dish) {
             dish.ingredients.forEach(ing => {
               const rm = rawMaterials.find(r => r.id === ing.rawMaterialId);
               if (rm) {
                 const current = updatedMaterials.get(rm.id) ?? rm.stock;
                 updatedMaterials.set(rm.id, current + (ing.quantity * cartItem.quantity));
               }
             });
          }
        }
      });

      updatedDrinks.forEach((stock, id) => {
        batch.update(doc(db, 'drinks', id), { stock });
      });

      updatedMaterials.forEach((stock, id) => {
        batch.update(doc(db, 'rawMaterials', id), { stock });
      });

      batch.update(doc(db, 'orders', orderId), { status: 'voided' });

      await batch.commit();
    } catch (e) {
      console.error("Error voiding order:", e);
      Swal.fire({ title: 'Error', text: 'Error al anular el pedido. Revisa tu conexión.', icon: 'error', confirmButtonColor: '#000' });
    }
  };

  const formatPrice = (price: number) => `USD/ ${price.toFixed(2)}`;

  if (!isDbLoaded) {
    return <LoadingScreen />;
  }

  if (!currentUser) {
    return <LoginView users={users} onLogin={(u) => { setCurrentUser(u); setShowWelcome(true); }} />;
  }

  const canView = (view: string) => {
    if (currentUser.role === 'Administrador') return true;
    if (currentUser.role === 'Cajero' || currentUser.role === 'Mesero') return view === 'pos' || view === 'mesas';
    return false;
  };

  return (
    <div className="flex h-[100dvh] bg-[#F7F4F0] text-[#1A1A1A] font-sans p-3 lg:p-4 pb-[80px] lg:pb-4 overflow-hidden select-none gap-4 relative">
      {showWelcome && (
        <WelcomeModal user={currentUser} onClose={() => setShowWelcome(false)} />
      )}
      
      <div className="hidden lg:flex lg:w-[220px] xl:w-[260px] flex-col shrink-0 gap-2 h-full z-10">
        <div className="bg-[#B91C1C] text-white p-4 rounded-2xl flex flex-col justify-between border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
          <div className="flex flex-col z-10">
            <span className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Restaurante</span>
            <h1 className="text-3xl font-black italic uppercase leading-tight">Chifa <br/>Mei Hua</h1>
            <span className="text-[#FFD700] font-black uppercase tracking-widest text-sm mt-1">Sistema</span>
          </div>
          <div className="absolute -bottom-6 -right-6 opacity-20 pointer-events-none">
             <ChefHat className="w-32 h-32 text-white" />
          </div>
        </div>

        <nav className="flex-1 bg-white p-2 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-1 overflow-y-auto">
          {canView('mesas') && (
            <button
              onClick={() => setCurrentView('mesas')}
              className={`w-full text-left px-4 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-3 transition-all ${
                currentView === 'mesas' ? 'bg-[#FFD700] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-1' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <LayoutGrid className="w-5 h-5" /> Mesas
            </button>
          )}
          {canView('pos') && (
            <button
              onClick={() => {
                setActiveTableId(null);
                setTableNumber('');
                setCart([]);
                setCurrentView('pos');
              }}
              className={`w-full text-left px-4 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-3 transition-all ${
                currentView === 'pos' ? 'bg-[#FFD700] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-1' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Store className="w-5 h-5" /> Punto de Venta
            </button>
          )}
          {canView('materia_prima') && (
            <button
              onClick={() => setCurrentView('materia_prima')}
              className={`w-full text-left px-4 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-3 transition-all ${
                currentView === 'materia_prima' ? 'bg-[#FFD700] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-1' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Package className="w-5 h-5" /> Materia Prima
            </button>
          )}
          {canView('inv_comida') && (
            <button
              onClick={() => setCurrentView('inv_comida')}
              className={`w-full text-left px-4 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-3 transition-all ${
                currentView === 'inv_comida' ? 'bg-[#FFD700] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-1' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <ChefHat className="w-5 h-5" /> Inv. Comidas
            </button>
          )}
          {canView('inv_bebidas') && (
            <button
              onClick={() => setCurrentView('inv_bebidas')}
              className={`w-full text-left px-4 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-3 transition-all ${
                currentView === 'inv_bebidas' ? 'bg-[#FFD700] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-1' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Wine className="w-5 h-5" /> Inv. Bebidas
            </button>
          )}
          {canView('inv_comida') && (
            <button
              onClick={() => setCurrentView('combos')}
              className={`w-full text-left px-4 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-3 transition-all ${
                currentView === 'combos' ? 'bg-[#FFD700] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-1' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Layers className="w-5 h-5" /> Combos
            </button>
          )}
          
          <div className="my-0.5 border-b border-dashed border-slate-200"></div>

          {canView('ventas') && (
            <button
              onClick={() => setCurrentView('ventas')}
              className={`w-full text-left px-4 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-3 transition-all ${
                currentView === 'ventas' ? 'bg-[#FFD700] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-1' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <LineChart className="w-5 h-5" /> Ventas
            </button>
          )}
          {canView('usuarios') && (
            <button
              onClick={() => setCurrentView('usuarios')}
              className={`w-full text-left px-4 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-3 transition-all ${
                currentView === 'usuarios' ? 'bg-[#FFD700] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-1' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Users className="w-5 h-5" /> Personal
            </button>
          )}
        </nav>

        <div className="bg-white p-3 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-black opacity-50">Sesión Actual</span>
            <span className="text-xs font-bold truncate max-w-[120px]">{currentUser.name}</span>
            <span className="text-[10px] font-bold text-[#B91C1C] uppercase mt-0.5">{currentUser.role}</span>
          </div>
          <button type="button" onClick={() => setShowLogoutConfirm(true)} className="bg-slate-100 p-3 rounded-xl border-2 border-black hover:bg-[#B91C1C] hover:text-white transition-colors cursor-pointer">
            <LogOut className="w-5 h-5 pointer-events-none" />
          </button>
        </div>
        
        <div className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest mt-auto shrink-0 pb-1">
          Elaborado por<br/><span className="text-[#B91C1C]">Palma Nexus Solutions</span>
        </div>
      </div>

      {/* =========================================
          MOBILE TOP BAR
          ========================================= */}
      <div className="lg:hidden flex flex-col shrink-0 gap-3 z-20 w-full absolute top-0 left-0 right-0 p-3 bg-[#F7F4F0]">
        <div className="bg-[#B91C1C] text-white p-3 rounded-xl flex justify-between items-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
          <div className="flex flex-col z-10">
            <h1 className="text-xl font-black italic uppercase leading-none">Chifa Mei Hua</h1>
            <span className="text-[#FFD700] text-[10px] font-black uppercase tracking-widest mt-1">Sistema {currentUser.role}</span>
          </div>
          <button type="button" onClick={() => setShowLogoutConfirm(true)} className="z-20 bg-black/30 p-3 rounded-lg text-white hover:text-[#FFD700] transition-colors cursor-pointer active:bg-black/50">
            <LogOut className="w-5 h-5 pointer-events-none" />
          </button>
        </div>
      </div>

      {/* =========================================
          MAIN CONTENT AREA
          ========================================= */}
      <div className="flex-1 flex flex-col min-w-0 z-10 h-full pt-[76px] lg:pt-0 pb-0">
        
        {/* POS Header Actions (Search) */}
        {currentView === 'pos' && (
          <div className="shrink-0 mb-4 flex flex-col sm:flex-row gap-3">
             <div className="relative w-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 opacity-40 text-black" />
              </div>
              <input
                type="text"
                placeholder="Buscar platillo..."
                className="block w-full pl-11 pr-4 py-3 border-2 border-black rounded-xl font-bold bg-white placeholder-[#1A1A1A] placeholder-opacity-40 focus:outline-none focus:bg-[#FFD700]/10 transition-colors uppercase text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* CONTENT VIEW */}
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {currentView === 'pos' ? (
            <div className="flex flex-col h-full bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              
              {/* Horizontal Categories */}
              <div className="shrink-0 px-4 pt-4 pb-2 border-b-2 border-black/10 bg-slate-50 flex gap-2 overflow-x-auto scrollbar-hide">
                {['Todos', ...CATEGORIES].map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setActiveCategory(category as Category | 'Todos');
                      setSearchQuery('');
                    }}
                    className={`px-5 py-2.5 rounded-full border-2 border-black font-black uppercase text-xs whitespace-nowrap transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none ${
                      activeCategory === category && !searchQuery
                        ? 'bg-[#B91C1C] text-white'
                        : 'bg-white hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    {category === 'Especial' ? 'Platos Especiales' : category}
                  </button>
                ))}
              </div>

              {/* Menu Items Grid */}
              <div className="flex-1 overflow-y-auto p-4 content-start">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {filteredItems.map((item) => {
                    const maxStock = getMaxAvailable(item);
                    const isOutOfStock = maxStock === 0;
                    const isLowStock = maxStock > 0 && maxStock <= 5;
                    
                    return (
                    <div
                      key={item.id}
                      onClick={() => !isOutOfStock && addToCart(item)}
                      className={`p-4 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between min-h-[140px] relative ${
                        isOutOfStock 
                          ? 'bg-slate-200 opacity-60 cursor-not-allowed' 
                          : 'bg-white hover:bg-[#FFD700] hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] cursor-pointer group'
                      }`}
                    >
                      {isOutOfStock && (
                        <div className="absolute top-2 right-2 bg-[#B91C1C] text-white text-[10px] font-black px-2 py-1 rounded border-2 border-black transform rotate-6 z-10 uppercase">
                          Agotado
                        </div>
                      )}
                      {!isOutOfStock && isLowStock && maxStock !== Infinity && (
                        <div className="absolute top-2 right-2 bg-[#FFD700] text-black text-[10px] font-black px-2 py-1 rounded border-2 border-black z-10 uppercase">
                          Stock Bajo: {maxStock}
                        </div>
                      )}
                      <div>
                        <h3 className={`font-black text-sm lg:text-base leading-tight uppercase transition-colors line-clamp-2 ${!isOutOfStock && 'group-hover:text-black'}`}>
                          {item.name}
                        </h3>
                        <span className="text-[10px] font-bold uppercase opacity-50 mt-1 block">{item.category === 'Especial' ? 'Platos Especiales' : item.category}</span>
                      </div>
                      <div className="flex justify-between items-end mt-4">
                        <span className="text-xl font-black">
                          {formatPrice(item.price)}
                        </span>
                        {!isOutOfStock && (
                          <button className="w-8 h-8 bg-black text-white rounded-lg border-2 border-black flex items-center justify-center font-bold relative overflow-hidden group-hover:bg-[#B91C1C] transition-colors">
                            <Plus className="w-5 h-5 absolute" />
                          </button>
                        )}
                      </div>
                    </div>
                  )})}
                  
                  {filteredItems.length === 0 && (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center text-center opacity-40">
                      <Search className="w-12 h-12 mb-3" />
                      <span className="font-black uppercase text-sm tracking-widest">No se encontraron platillos.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : currentView === 'mesas' ? (
            <MesasView 
              activeTables={activeTables}
              onSelectTable={handleTableClick}
              totalTables={30}
            />
          ) : currentView === 'materia_prima' ? (
            <MateriaPrimaView 
              rawMaterials={rawMaterials} 
              onAddMaterial={async (m) => await setDoc(doc(db, 'rawMaterials', m.id), m)}
              onDeleteMaterial={async (id) => {
                const usedInDish = dishes.find(d => d.ingredients?.some(ing => ing.rawMaterialId === id));
                if (usedInDish) {
                  Swal.fire({
                    title: 'Acción Bloqueada',
                    text: `No puedes eliminar esta Materia Prima porque está siendo usada en la receta de "${usedInDish.name}". Elimínala de la receta primero.`,
                    icon: 'error',
                    confirmButtonColor: '#B91C1C'
                  });
                  return;
                }
                await deleteDoc(doc(db, 'rawMaterials', id));
              }}
            />
          ) : currentView === 'ventas' ? (
            <SalesView 
              orders={currentUser?.role === 'Administrador' ? orders : orders.filter(o => o.sellerId === currentUser?.id)}
              currentUser={currentUser}
              onViewReceipt={(order) => setCompletedOrder(order)}
              onDeleteOrder={async (id) => await deleteDoc(doc(db, 'orders', id))}
              onVoidOrder={handleVoidOrder}
              timeRange={timeRange}
              setTimeRange={setTimeRange}
              customDateRange={customDateRange}
              setCustomDateRange={setCustomDateRange}
            />
          ) : currentView === 'usuarios' ? (
            <UsersView
              users={users}
              onAddUser={async (u) => {
                try {
                  await setDoc(doc(db, 'users', u.id), u);
                } catch (e) {
                  console.error(e);
                  Swal.fire({ title: 'Error', text: 'Error al guardar usuario. ¿Está habilitada la base de datos Firestore?', icon: 'error', confirmButtonColor: '#000' });
                }
              }}
              onDeleteUser={async (id) => {
                try {
                  await deleteDoc(doc(db, 'users', id));
                } catch (e) {
                  console.error(e);
                  Swal.fire({ title: 'Error', text: 'Error al eliminar usuario.', icon: 'error', confirmButtonColor: '#000' });
                }
              }}
            />
          ) : currentView === 'inv_comida' ? (
            <DishInventoryView 
              dishes={dishes}
              rawMaterials={rawMaterials}
              onAddDish={async (d) => await setDoc(doc(db, 'dishes', d.id), d)}
              onDeleteDish={async (id) => {
                const usedInCombo = combos.find(c => c.items?.some((i: any) => i.type === 'dish' && i.itemId === id));
                if (usedInCombo) {
                  Swal.fire({
                    title: 'Acción Bloqueada',
                    text: `No puedes eliminar este platillo porque forma parte del combo "${usedInCombo.name}". Elimínalo del combo primero.`,
                    icon: 'error',
                    confirmButtonColor: '#B91C1C'
                  });
                  return;
                }
                await deleteDoc(doc(db, 'dishes', id));
              }}
            />
          ) : currentView === 'combos' ? (
            <ComboInventoryView 
              combos={combos}
              dishes={dishes}
              drinks={drinks}
              rawMaterials={rawMaterials}
              onAddCombo={async (c) => await setDoc(doc(db, 'combos', c.id), c)}
              onDeleteCombo={async (id) => await deleteDoc(doc(db, 'combos', id))}
            />
          ) : (
            <DrinkInventoryView 
              drinks={drinks} 
              onAddDrink={async (d) => await setDoc(doc(db, 'drinks', d.id), d)}
              onDeleteDrink={async (id) => {
                const usedInCombo = combos.find(c => c.items?.some((i: any) => i.type === 'drink' && i.itemId === id));
                if (usedInCombo) {
                  Swal.fire({
                    title: 'Acción Bloqueada',
                    text: `No puedes eliminar esta bebida porque forma parte del combo "${usedInCombo.name}". Elimínala del combo primero.`,
                    icon: 'error',
                    confirmButtonColor: '#B91C1C'
                  });
                  return;
                }
                await deleteDoc(doc(db, 'drinks', id));
              }}
            />
          )}
        </div>
      </div>

      {/* RIGHT PANEL - CART */}
      {currentView === 'pos' && (
        <div className="w-[320px] xl:w-[380px] bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-20 hidden lg:flex flex-col overflow-hidden shrink-0">
        
        {/* Cart Header */}
        <div className="bg-[#B91C1C] text-white p-5 flex flex-col gap-1 z-10 shrink-0 border-b-2 border-black">
          <h2 className="font-black uppercase tracking-widest italic flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#FFD700]" />
            Nota de Venta
          </h2>
          <span className="text-[10px] uppercase font-bold opacity-80">Nuevo Pedido</span>
        </div>
          
        <div className="p-4 bg-[#F7F4F0] border-b-2 border-black z-10 shrink-0 flex flex-col gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UtensilsCrossed className="h-4 w-4 opacity-50 text-black" />
            </div>
            <input
              type="text"
              placeholder="Mesa o Para llevar (Obligatorio)"
              className="w-full pl-9 pr-3 py-2 bg-white border-2 border-black rounded-xl text-sm font-bold focus:outline-none uppercase placeholder:normal-case placeholder:font-medium"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
            />
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto w-full p-4 scrollbar-hide">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#1A1A1A] gap-3 opacity-30">
              <ShoppingBag className="w-12 h-12 stroke-2" />
              <p className="text-sm font-bold uppercase text-center">Seleccione platillos<br/>del menú</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center border-b border-dashed border-slate-300 pb-3">
                  <div className="flex items-center gap-3">
                    <input 
                      type="number" 
                      step="any"
                      min="0"
                      className="font-black text-[#B91C1C] text-lg w-16 bg-transparent text-center border-b-2 border-transparent focus:border-[#B91C1C] focus:outline-none hide-spin-button"
                      value={item.quantity}
                      onChange={(e) => updateQuantityExact(item.id, e.target.value)}
                      onBlur={() => handleBlurQuantity(item.id)}
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-sm uppercase leading-tight">{item.menuItem.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] opacity-50 font-bold uppercase">{formatPrice(item.menuItem.price)} c/u</span>
                        <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                          {currentUser?.role === 'Administrador' && (
                            <button onClick={() => updateQuantity(item.id, -1)} className="bg-slate-200 border border-black rounded w-5 h-5 flex items-center justify-center text-black">
                              {item.quantity === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            </button>
                          )}
                          <button onClick={() => updateQuantity(item.id, 1)} className="bg-slate-200 border border-black rounded w-5 h-5 flex items-center justify-center text-black">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-sm shrink-0 pl-2">
                    {formatPrice(item.menuItem.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout Section */}
        <div className="p-4 bg-slate-50 border-t-2 border-black shrink-0">
          <div className="flex justify-between items-center mb-2">
             <label className="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase opacity-80 select-none">
                <input type="checkbox" checked={isHolidayIva} onChange={(e) => setIsHolidayIva(e.target.checked)} className="w-4 h-4 cursor-pointer accent-[#B91C1C]" />
                Feriado (IVA 8%)
             </label>
          </div>
          <div className="flex justify-between mb-1 text-sm">
            <span className="opacity-60 font-bold uppercase">Subtotal</span>
            <span className="font-bold">{formatPrice(cartTotal / (isHolidayIva ? 1.08 : 1.15))}</span>
          </div>
          <div className="flex justify-between mb-3 text-sm">
            <span className="opacity-60 font-bold uppercase">IVA ({isHolidayIva ? '8%' : '15%'})</span>
            <span className="font-bold">{formatPrice(cartTotal - (cartTotal / (isHolidayIva ? 1.08 : 1.15)))}</span>
          </div>
          <div className="flex justify-between items-end mb-4">
            <span className="text-xs font-black uppercase tracking-widest">Total a Pagar</span>
            <span className="text-3xl font-black">{formatPrice(cartTotal)}</span>
          </div>
          
          <div className="flex justify-between items-center mb-2 gap-2">
            <span className="text-xs font-bold uppercase opacity-80">Efectivo</span>
            <input 
              type="number" 
              placeholder="0.00" 
              className="w-24 px-2 py-1 bg-white border-2 border-black rounded text-right font-black text-sm focus:outline-none focus:border-[#B91C1C]" 
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
            />
          </div>
          
          {parseFloat(cashReceived) > 0 && (
            <div className="flex justify-between items-end mb-6">
              <span className="text-xs font-black uppercase tracking-widest text-[#B91C1C]">Vuelto</span>
              <span className="text-xl font-black text-[#B91C1C]">{formatPrice(Math.max(0, parseFloat(cashReceived) - cartTotal))}</span>
            </div>
          )}
          
          <div className="flex gap-2">
            {currentUser?.role === 'Administrador' && (
              <button
                onClick={clearCart}
                disabled={cart.length === 0 || isCheckingOut}
                className="py-4 px-4 bg-white border-2 border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] transition-all disabled:opacity-50 disabled:shadow-none disabled:active:translate-y-0"
                title="Limpiar Orden"
              >
                <Trash2 className="w-5 h-5 text-[#B91C1C]" />
              </button>
            )}
            <button
              onClick={handlePrintPreview}
              disabled={cart.length === 0 || isCheckingOut}
              className="py-4 px-4 bg-white border-2 border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] transition-all disabled:opacity-50 disabled:shadow-none disabled:active:translate-y-0"
              title="Imprimir Pre-cuenta o Comanda"
            >
              <Printer className="w-5 h-5 text-black" />
            </button>
            {activeTableId ? (
              <div className="flex flex-col gap-2 flex-1">
                <button
                  onClick={handleSaveTable}
                  disabled={cart.length === 0 || isCheckingOut}
                  className="w-full py-2 px-2 bg-white border-2 border-black rounded-xl font-black uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FFD700] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
                >
                  {isCheckingOut ? '...' : `Guardar en Mesa ${activeTableId}`}
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || isCheckingOut}
                  className="w-full py-2 px-2 bg-black text-[#FFD700] border-2 border-black rounded-xl font-black uppercase text-xs tracking-[0.1em] shadow-[2px_2px_0px_0px_rgba(185,28,28,1)] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
                >
                  {isCheckingOut ? '...' : 'Cobrar y Liberar'}
                </button>
                {currentUser?.role === 'Administrador' && (
                  <button
                    onClick={handleFreeTableWithoutCheckout}
                    disabled={isCheckingOut}
                    className="w-full py-2 px-2 bg-[#B91C1C] text-white border-2 border-black rounded-xl font-black uppercase text-[10px] tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
                  >
                    {isCheckingOut ? '...' : 'Liberar Sin Cobrar'}
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || isCheckingOut}
                className="flex-1 py-4 px-4 bg-black text-[#FFD700] border-2 border-black rounded-xl font-black uppercase text-sm tracking-[0.2em] shadow-[2px_2px_0px_0px_rgba(185,28,28,1)] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:shadow-none disabled:active:translate-y-0"
              >
                {isCheckingOut ? 'Procesando...' : 'Cobrar y Emitir Nota'}
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Floating Cart Button for Mobile */}
      {currentView === 'pos' && cart.length > 0 && !isMobileCartOpen && (
        <button 
          className="lg:hidden fixed bottom-[90px] right-6 w-16 h-16 bg-[#B91C1C] text-white rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center z-40 active:translate-y-[2px] active:shadow-none transition-all"
          onClick={() => setIsMobileCartOpen(true)}
        >
          <div className="relative">
            <ShoppingBag className="w-6 h-6" />
            <span className="absolute -top-2 -right-3 bg-[#FFD700] text-black text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-black">
              {cart.length}
            </span>
          </div>
        </button>
      )}

      {/* MOBILE FULLSCREEN CART MODAL */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 bg-white z-[60] flex flex-col h-[100dvh]">
          {/* Cart Header */}
          <div className="bg-[#B91C1C] text-white p-4 flex justify-between items-center z-10 shrink-0 border-b-2 border-black">
            <h2 className="font-black uppercase tracking-widest italic flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#FFD700]" />
              Mi Pedido
            </h2>
            <button onClick={() => setIsMobileCartOpen(false)} className="p-1 hover:bg-black/20 rounded transition-colors text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-4 bg-[#F7F4F0] border-b-2 border-black z-10 shrink-0 flex flex-col gap-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UtensilsCrossed className="h-4 w-4 opacity-50 text-black" />
              </div>
              <input
                type="text"
                placeholder="Mesa o Para llevar (Obligatorio)"
                className="w-full pl-9 pr-3 py-3 bg-white border-2 border-black rounded-xl text-sm font-bold focus:outline-none uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] placeholder:normal-case placeholder:font-medium"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto w-full p-4 scrollbar-hide bg-white">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#1A1A1A] gap-3 opacity-40">
                <ShoppingBag className="w-16 h-16 stroke-2" />
                <p className="text-base font-bold uppercase text-center mt-2">Tu carrito está vacío</p>
                <button onClick={() => setIsMobileCartOpen(false)} className="mt-4 px-6 py-3 border-2 border-black rounded-xl font-bold uppercase text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] bg-[#FFD700]">Volver al menú</button>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center border-b border-dashed border-slate-300 pb-3">
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        step="any"
                        min="0"
                        className="font-black text-[#B91C1C] text-xl w-20 bg-transparent text-center border-b-2 border-transparent focus:border-[#B91C1C] focus:outline-none hide-spin-button"
                        value={item.quantity}
                        onChange={(e) => updateQuantityExact(item.id, e.target.value)}
                        onBlur={() => handleBlurQuantity(item.id)}
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-sm uppercase leading-tight line-clamp-2">{item.menuItem.name}</span>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs opacity-60 font-bold uppercase">{formatPrice(item.menuItem.price)} c/u</span>
                          <div className="flex items-center gap-1 opacity-80">
                            {currentUser?.role === 'Administrador' && (
                              <button onClick={() => updateQuantity(item.id, -1)} className="bg-[#F7F4F0] border-2 border-black rounded w-7 h-7 flex items-center justify-center text-black active:bg-slate-200">
                                {item.quantity === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                              </button>
                            )}
                            <button onClick={() => updateQuantity(item.id, 1)} className="bg-[#F7F4F0] border-2 border-black rounded w-7 h-7 flex items-center justify-center text-black active:bg-slate-200">
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <span className="font-black text-sm shrink-0 pl-2 self-start pt-1">
                      {formatPrice(item.menuItem.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout Section Mobile */}
          <div className="p-4 bg-slate-50 border-t-2 border-black shrink-0">
            <div className="flex justify-between items-center mb-3">
               <label className="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase opacity-80 select-none">
                  <input type="checkbox" checked={isHolidayIva} onChange={(e) => setIsHolidayIva(e.target.checked)} className="w-4 h-4 cursor-pointer accent-[#B91C1C]" />
                  Feriado (IVA 8%)
               </label>
            </div>
            <div className="flex justify-between items-end mb-4">
              <div className="flex flex-col">
                <span className="opacity-60 text-[10px] font-bold uppercase">Total (Inc. IVA)</span>
                <span className="text-2xl font-black">{formatPrice(cartTotal)}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center mb-2 gap-2">
              <span className="text-xs font-bold uppercase opacity-80">Efectivo</span>
              <input 
                type="number" 
                placeholder="0.00" 
                className="w-24 px-2 py-1 bg-white border-2 border-black rounded text-right font-black text-sm focus:outline-none focus:border-[#B91C1C]" 
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
              />
            </div>
            
            {parseFloat(cashReceived) > 0 && (
              <div className="flex justify-between items-end mb-4">
                <span className="text-xs font-black uppercase tracking-widest text-[#B91C1C]">Vuelto</span>
                <span className="text-xl font-black text-[#B91C1C]">{formatPrice(Math.max(0, parseFloat(cashReceived) - cartTotal))}</span>
              </div>
            )}
              <div className="flex gap-2">
                {currentUser?.role === 'Administrador' && (
                  <button
                    onClick={clearCart}
                    disabled={cart.length === 0 || isCheckingOut}
                    className="p-3 bg-white border-2 border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] transition-all disabled:opacity-50 disabled:shadow-none"
                  >
                    <Trash2 className="w-5 h-5 text-[#B91C1C]" />
                  </button>
                )}
                <button
                  onClick={handlePrintPreview}
                  disabled={cart.length === 0 || isCheckingOut}
                  className="p-3 bg-white border-2 border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] transition-all disabled:opacity-50 disabled:shadow-none"
                >
                  <Printer className="w-5 h-5 text-black" />
                </button>
              </div>
            
            {activeTableId ? (
              <>
                <div className="flex gap-2">
                  <button
                    onClick={() => { handleSaveTable(); setIsMobileCartOpen(false); }}
                    disabled={cart.length === 0 || isCheckingOut}
                    className="flex-1 py-3 px-2 bg-white border-2 border-black rounded-xl font-black uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
                  >
                    {isCheckingOut ? '...' : `Guardar M${activeTableId}`}
                  </button>
                  <button
                    onClick={() => { handleCheckout(); setIsMobileCartOpen(false); }}
                    disabled={cart.length === 0 || isCheckingOut}
                    className="flex-1 py-3 px-2 bg-black text-[#FFD700] border-2 border-black rounded-xl font-black uppercase text-xs tracking-widest shadow-[2px_2px_0px_0px_rgba(185,28,28,1)] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
                  >
                    {isCheckingOut ? '...' : 'Cobrar'}
                  </button>
                </div>
                {currentUser?.role === 'Administrador' && (
                  <button
                    onClick={() => { handleFreeTableWithoutCheckout(); setIsMobileCartOpen(false); }}
                    disabled={isCheckingOut}
                    className="w-full mt-2 py-3 px-2 bg-[#B91C1C] text-white border-2 border-black rounded-xl font-black uppercase text-[10px] tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
                  >
                    {isCheckingOut ? '...' : 'Liberar Sin Cobrar (Admin)'}
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => { handleCheckout(); setIsMobileCartOpen(false); }}
                disabled={cart.length === 0 || isCheckingOut}
                className="w-full py-4 px-4 bg-black text-[#FFD700] border-2 border-black rounded-xl font-black uppercase text-sm tracking-widest shadow-[4px_4px_0px_0px_rgba(185,28,28,1)] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:shadow-none disabled:active:translate-y-0"
              >
                {isCheckingOut ? 'Procesando...' : 'Cobrar Pedido'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black flex justify-around items-center h-[72px] px-1 z-50 shadow-[0px_-4px_0px_0px_rgba(0,0,0,0.1)] overflow-x-auto">
        {canView('mesas') && (
           <button onClick={() => setCurrentView('mesas')} className={`flex flex-col items-center justify-center min-w-[64px] h-full gap-1 active:scale-95 transition-transform ${currentView === 'mesas' ? 'text-[#B91C1C]' : 'opacity-40 hover:opacity-80'}`}>
             <LayoutGrid className="w-5 h-5"/>
             <span className="text-[9px] font-black uppercase tracking-wider">Mesas</span>
           </button>
        )}
        {canView('pos') && (
           <button onClick={() => setCurrentView('pos')} className={`flex flex-col items-center justify-center min-w-[64px] h-full gap-1 active:scale-95 transition-transform ${currentView === 'pos' ? 'text-[#B91C1C]' : 'opacity-40 hover:opacity-80'}`}>
             <Store className="w-5 h-5"/>
             <span className="text-[9px] font-black uppercase tracking-wider">Venta</span>
           </button>
        )}
        {canView('materia_prima') && (
           <button onClick={() => setCurrentView('materia_prima')} className={`flex flex-col items-center justify-center min-w-[64px] h-full gap-1 active:scale-95 transition-transform ${currentView === 'materia_prima' ? 'text-[#B91C1C]' : 'opacity-40 hover:opacity-80'}`}>
             <Package className="w-5 h-5"/>
             <span className="text-[9px] font-black uppercase tracking-wider">Insumos</span>
           </button>
        )}
        {canView('inv_comida') && (
           <button onClick={() => setCurrentView('inv_comida')} className={`flex flex-col items-center justify-center min-w-[64px] h-full gap-1 active:scale-95 transition-transform ${currentView === 'inv_comida' ? 'text-[#B91C1C]' : 'opacity-40 hover:opacity-80'}`}>
             <ChefHat className="w-5 h-5"/>
             <span className="text-[9px] font-black uppercase tracking-wider">Comidas</span>
           </button>
        )}
        {canView('inv_bebidas') && (
           <button onClick={() => setCurrentView('inv_bebidas')} className={`flex flex-col items-center justify-center min-w-[64px] h-full gap-1 active:scale-95 transition-transform ${currentView === 'inv_bebidas' ? 'text-[#B91C1C]' : 'opacity-40 hover:opacity-80'}`}>
             <Wine className="w-5 h-5"/>
             <span className="text-[9px] font-black uppercase tracking-wider">Bebida</span>
           </button>
        )}
        {canView('ventas') && (
           <button onClick={() => setCurrentView('ventas')} className={`flex flex-col items-center justify-center min-w-[64px] h-full gap-1 active:scale-95 transition-transform ${currentView === 'ventas' ? 'text-[#B91C1C]' : 'opacity-40 hover:opacity-80'}`}>
             <LineChart className="w-5 h-5"/>
             <span className="text-[9px] font-black uppercase tracking-wider">Ventas</span>
           </button>
        )}
        {canView('usuarios') && (
           <button onClick={() => setCurrentView('usuarios')} className={`flex flex-col items-center justify-center min-w-[64px] h-full gap-1 active:scale-95 transition-transform ${currentView === 'usuarios' ? 'text-[#B91C1C]' : 'opacity-40 hover:opacity-80'}`}>
             <Users className="w-5 h-5"/>
             <span className="text-[9px] font-black uppercase tracking-wider">Cajeros</span>
           </button>
        )}
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#F7F4F0] rounded-3xl w-full max-w-sm overflow-hidden border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col relative animate-fade-in-up">
            <button 
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full border-2 border-black hover:bg-slate-100 transition-colors z-10"
            >
              <X className="w-5 h-5 pointer-events-none" />
            </button>
            <div className="bg-[#B91C1C] text-white p-6 pb-8 border-b-4 border-black relative overflow-hidden">
              <LogOut className="w-12 h-12 mb-4 opacity-90" />
              <h2 className="text-3xl font-black italic uppercase leading-none tracking-tight">Cerrar Sesión</h2>
            </div>
            <div className="p-6">
              <p className="text-lg font-bold mb-8">¿Estás seguro de cerrar sesión?</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-3 bg-white border-2 border-black rounded-xl font-bold hover:bg-slate-50 transition-colors text-black"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    setCurrentUser(null);
                    setCurrentView('pos');
                    setCart([]);
                    setTableNumber('');
                    setActiveTableId(null);
                  }}
                  className="flex-1 px-4 py-3 bg-[#B91C1C] border-2 border-black rounded-xl font-bold hover:bg-red-800 transition-colors text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal (Nota de Venta) */}
      {completedOrder && (
        <ReceiptModal 
          order={completedOrder} 
          onClose={handleCloseReceipt} 
          onKitchenPrint={() => {
            const newCart = cart.map(item => ({ ...item, printedQuantity: item.quantity }));
            setCart(newCart);
            if (activeTableId && completedOrder.id.startsWith('preview')) {
               handleSaveTable(newCart);
            }
          }}
        />
      )}

    </div>
  );
}
