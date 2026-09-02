import React, { useState, useMemo } from 'react';
import { Order, UserAccount } from '../types';
import { FileText, Printer, ChevronRight, TrendingUp, DollarSign, Activity, Users, BarChart as BarChartIcon, List, Trash2, Ban, Package, Download, Bike, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { generateInventoryPDF } from '../utils/pdfGenerator';
import Swal from 'sweetalert2';

interface SalesViewProps {
  orders: Order[];
  currentUser: UserAccount | null;
  onViewReceipt: (order: Order) => void;
  onDeleteOrder?: (id: string) => void;
  onVoidOrder?: (id: string) => void;
  timeRange: 'all' | 'day' | 'week' | 'year' | 'custom';
  setTimeRange: (range: 'all' | 'day' | 'week' | 'year' | 'custom') => void;
  customDateRange: { start: string; end: string };
  setCustomDateRange: (range: { start: string; end: string }) => void;
}

export function SalesView({ orders, currentUser, onViewReceipt, onDeleteOrder, onVoidOrder, timeRange, setTimeRange, customDateRange, setCustomDateRange }: SalesViewProps) {
  const defaultBranch = currentUser?.branchId || (currentUser?.cedula === '1714851332001' ? '2' : '1');
  const [selectedBranch, setSelectedBranch] = useState<string>(defaultBranch);
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [selectedOrderType, setSelectedOrderType] = useState<'all' | 'mesas' | 'domicilio' | 'pedidos_ya' | 'rappi' | 'uber'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'chart' | 'summary'>('list');

  const handleVoidOrderConfirm = async (orderId: string) => {
    const result = await Swal.fire({
      title: '¿Anular esta orden?',
      text: 'Los productos vendidos regresarán al inventario y los totales se descontarán de las ganancias. Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#B91C1C',
      cancelButtonColor: '#1A1A1A',
      confirmButtonText: 'Sí, Anular Orden',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed && onVoidOrder) {
      onVoidOrder(orderId);
      Swal.fire({
        title: 'Orden Anulada',
        text: 'La orden ha sido anulada exitosamente y el inventario ha sido restituido.',
        icon: 'success',
        timer: 1800,
        showConfirmButton: false
      });
    }
  };

  const handleDeleteOrderConfirm = async (orderId: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar nota de venta?',
      text: 'Esta nota de venta se eliminará permanentemente del sistema.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#B91C1C',
      cancelButtonColor: '#1A1A1A',
      confirmButtonText: 'Sí, Eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed && onDeleteOrder) {
      onDeleteOrder(orderId);
      Swal.fire({
        title: 'Eliminada',
        text: 'La nota de venta ha sido eliminada del registro.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  const sellers = useMemo(() => {
    const list = new Map<string, string>();
    orders.forEach(o => {
      if (o.sellerId && o.sellerName) {
         list.set(o.sellerId, o.sellerName);
      }
    });
    return Array.from(list.entries()).map(([id, name]) => ({ id, name }));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let filtered = orders;
    
    if (selectedBranch !== 'all') {
      filtered = filtered.filter(o => (o.branchId || '1') === selectedBranch);
    }

    if (selectedSeller !== 'all') {
      filtered = filtered.filter(o => o.sellerId === selectedSeller);
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const currentDay = now.getDay();
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    if (timeRange === 'day') {
      filtered = filtered.filter(o => new Date(o.date).getTime() >= startOfDay);
    } else if (timeRange === 'week') {
      filtered = filtered.filter(o => new Date(o.date).getTime() >= startOfWeek);
    } else if (timeRange === 'year') {
      filtered = filtered.filter(o => new Date(o.date).getTime() >= startOfYear);
    } else if (timeRange === 'custom') {
      if (customDateRange.start && customDateRange.end) {
        const [sYear, sMonth, sDay] = customDateRange.start.split('-').map(Number);
        const start = new Date(sYear, sMonth - 1, sDay);
        start.setHours(0, 0, 0, 0);
        const [eYear, eMonth, eDay] = customDateRange.end.split('-').map(Number);
        const end = new Date(eYear, eMonth - 1, eDay);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(o => {
          const t = new Date(o.date).getTime();
          return t >= start.getTime() && t <= end.getTime();
        });
      } else if (customDateRange.start) {
        const [sYear, sMonth, sDay] = customDateRange.start.split('-').map(Number);
        const start = new Date(sYear, sMonth - 1, sDay);
        start.setHours(0, 0, 0, 0);
        filtered = filtered.filter(o => new Date(o.date).getTime() >= start.getTime());
      } else if (customDateRange.end) {
        const [eYear, eMonth, eDay] = customDateRange.end.split('-').map(Number);
        const end = new Date(eYear, eMonth - 1, eDay);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(o => new Date(o.date).getTime() <= end.getTime());
      }
    }

    if (selectedOrderType === 'pedidos_ya') {
      filtered = filtered.filter(o => {
        const norm = (o.tableNumber || '').trim().toLowerCase();
        return norm === 'pedidosya' || norm === 'pedidos ya' || norm.startsWith('pedidos');
      });
    } else if (selectedOrderType === 'rappi') {
      filtered = filtered.filter(o => (o.tableNumber || '').trim().toLowerCase() === 'rappi');
    } else if (selectedOrderType === 'uber') {
      filtered = filtered.filter(o => {
        const norm = (o.tableNumber || '').trim().toLowerCase();
        return norm === 'uber' || norm === 'uber eats' || norm.startsWith('uber');
      });
    } else if (selectedOrderType === 'domicilio') {
      filtered = filtered.filter(o => {
        const norm = (o.tableNumber || '').trim().toLowerCase();
        return norm === 'domicilio' || norm === 'para llevar';
      });
    } else if (selectedOrderType === 'mesas') {
      filtered = filtered.filter(o => {
        const norm = (o.tableNumber || '').trim().toLowerCase();
        return norm !== 'pedidosya' && norm !== 'pedidos ya' && !norm.startsWith('pedidos') &&
               norm !== 'rappi' && norm !== 'uber' && norm !== 'uber eats' && !norm.startsWith('uber') &&
               norm !== 'domicilio' && norm !== 'para llevar';
      });
    }

    return filtered;
  }, [orders, selectedSeller, selectedOrderType, timeRange, customDateRange]);

  const formatPrice = (price: number) => `USD/ ${price.toFixed(2)}`;

  const validOrders = filteredOrders.filter(o => o.status !== 'voided');

  const orderTypeStats = useMemo(() => {
    let mesasCount = 0, mesasTotal = 0;
    let domicilioCount = 0, domicilioTotal = 0;
    let pyCount = 0, pyTotal = 0;
    let rappiCount = 0, rappiTotal = 0;
    let uberCount = 0, uberTotal = 0;

    // Calcular estadísticas globales con base en la lista filtrada de tiempo/vendedor/sucursal
    const activeNonVoided = orders.filter(o => {
      if (o.status === 'voided') return false;
      if (selectedBranch !== 'all' && (o.branchId || '1') !== selectedBranch) return false;
      if (selectedSeller !== 'all' && o.sellerId !== selectedSeller) return false;
      return true;
    });

    activeNonVoided.forEach(o => {
      const norm = (o.tableNumber || '').trim().toLowerCase();
      if (norm === 'pedidosya' || norm === 'pedidos ya' || norm.startsWith('pedidos')) {
        pyCount++;
        pyTotal += o.total;
      } else if (norm === 'rappi') {
        rappiCount++;
        rappiTotal += o.total;
      } else if (norm === 'uber' || norm === 'uber eats' || norm.startsWith('uber')) {
        uberCount++;
        uberTotal += o.total;
      } else if (norm === 'domicilio' || norm === 'para llevar') {
        domicilioCount++;
        domicilioTotal += o.total;
      } else {
        mesasCount++;
        mesasTotal += o.total;
      }
    });

    return { mesasCount, mesasTotal, domicilioCount, domicilioTotal, pyCount, pyTotal, rappiCount, rappiTotal, uberCount, uberTotal };
  }, [orders, selectedSeller]);

  const totalRevenue = validOrders.reduce((sum, order) => sum + order.total, 0);
  const totalCost = validOrders.reduce((sum, order) => sum + order.totalCost, 0);
  const totalProfit = validOrders.reduce((sum, order) => sum + order.profit, 0);

  const chartData = useMemo(() => {
    const dataByDate = new Map<string, { label: string, Ingresos: number, Ganancia: number }>();
    
    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    if (timeRange === 'week') {
       ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].forEach(day => {
         dataByDate.set(day, { label: day, Ingresos: 0, Ganancia: 0 });
       });
    } else if (timeRange === 'year') {
       months.forEach(month => {
         dataByDate.set(month, { label: month, Ingresos: 0, Ganancia: 0 });
       });
    }

    const sortedOrders = [...validOrders].sort((a, b) => a.date.localeCompare(b.date));

    sortedOrders.forEach(order => {
      const d = new Date(order.date);
      let timeStr = '';
      
      if (timeRange === 'day') {
         d.setMinutes(0, 0, 0);
         timeStr = d.toLocaleTimeString('es-EC', { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit' });
      } else if (timeRange === 'week') {
         timeStr = weekDays[d.getDay()];
      } else if (timeRange === 'year') {
         timeStr = months[d.getMonth()];
      } else {
         timeStr = d.toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil', month: 'short', day: 'numeric', year: 'numeric' });
      }

      if (!dataByDate.has(timeStr)) {
        dataByDate.set(timeStr, { label: timeStr, Ingresos: 0, Ganancia: 0 });
      }
      const existing = dataByDate.get(timeStr)!;
      existing.Ingresos += order.total;
      existing.Ganancia += order.profit;
    });

    return Array.from(dataByDate.values());
  }, [filteredOrders, timeRange, validOrders]);

  const productSummary = useMemo(() => {
    const summary = new Map<string, { name: string, category: string, quantity: number, total: number }>();
    
    validOrders.forEach(order => {
      order.items.forEach(item => {
        const id = item.menuItem.id;
        if (!summary.has(id)) {
          summary.set(id, {
            name: item.menuItem.name,
            category: item.menuItem.category,
            quantity: 0,
            total: 0
          });
        }
        const existing = summary.get(id)!;
        existing.quantity += item.quantity;
        existing.total += item.quantity * item.menuItem.price;
      });
    });

    return Array.from(summary.values()).sort((a, b) => b.quantity - a.quantity);
  }, [validOrders]);

  const handleDownloadSummaryPDF = () => {
    generateInventoryPDF({
      title: 'Resumen de Productos Vendidos',
      filename: 'resumen_ventas',
      columns: ['Producto', 'Categoría', 'Cant. Vendida', 'Ingreso Total'],
      data: productSummary.map(item => [
        item.name,
        item.category,
        item.quantity.toString(),
        `$${item.total.toFixed(2)}`
      ])
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto xl:overflow-hidden bg-[#F7F4F0] gap-4 pb-[80px] xl:pb-0">
      {/* Filters (Organized Control Bar with Pill Buttons) */}
      <div className="shrink-0 flex flex-col gap-3 bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        
        {/* Row 1: Sucursal & Vendedor */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sucursal */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border-2 border-black">
            <span className="text-[10px] font-black uppercase text-slate-500 px-2">Sucursal:</span>
            <button
              type="button"
              onClick={() => setSelectedBranch('1')}
              className={`px-3 py-1.5 rounded-xl border-2 border-black font-black uppercase text-xs transition-all ${
                selectedBranch === '1'
                  ? 'bg-[#B91C1C] text-white shadow-none translate-y-[1px]'
                  : 'bg-white text-slate-800 hover:bg-slate-50 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              📍 Matriz
            </button>
            <button
              type="button"
              onClick={() => setSelectedBranch('2')}
              className={`px-3 py-1.5 rounded-xl border-2 border-black font-black uppercase text-xs transition-all ${
                selectedBranch === '2'
                  ? 'bg-[#B91C1C] text-white shadow-none translate-y-[1px]'
                  : 'bg-white text-slate-800 hover:bg-slate-50 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              📍 Sucursal 2
            </button>
            <button
              type="button"
              onClick={() => setSelectedBranch('all')}
              className={`px-3 py-1.5 rounded-xl border-2 border-black font-black uppercase text-xs transition-all ${
                selectedBranch === 'all'
                  ? 'bg-black text-[#FFD700] shadow-none translate-y-[1px]'
                  : 'bg-white text-slate-800 hover:bg-slate-50 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              📍 Todas
            </button>
          </div>

          {/* Vendedor (si es Administrador) */}
          {currentUser?.role === 'Administrador' && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border-2 border-black overflow-x-auto scrollbar-hide">
              <span className="text-[10px] font-black uppercase text-slate-500 px-2 shrink-0">Vendedor:</span>
              <button
                type="button"
                onClick={() => setSelectedSeller('all')}
                className={`px-3 py-1.5 rounded-xl border-2 border-black font-black uppercase text-xs transition-all whitespace-nowrap ${
                  selectedSeller === 'all'
                    ? 'bg-[#FFD700] text-black shadow-none translate-y-[1px]'
                    : 'bg-white text-slate-800 hover:bg-slate-50 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                }`}
              >
                General (Todos)
              </button>
              {sellers.map((seller) => (
                <button
                  type="button"
                  key={seller.id}
                  onClick={() => setSelectedSeller(seller.id)}
                  className={`px-3 py-1.5 rounded-xl border-2 border-black font-black uppercase text-xs transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    selectedSeller === seller.id
                      ? 'bg-[#FFD700] text-black shadow-none translate-y-[1px]'
                      : 'bg-white text-slate-800 hover:bg-slate-50 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  {seller.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Row 2: Período de Tiempo & Canal */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t-2 border-slate-100">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border-2 border-black">
            <span className="text-[10px] font-black uppercase text-slate-500 px-2">Período:</span>
            <button
              type="button"
              onClick={() => setTimeRange('day')}
              className={`px-3 py-1.5 rounded-xl border-2 border-black font-black uppercase text-xs transition-all ${
                 timeRange === 'day' ? 'bg-[#1A1A1A] text-white shadow-none translate-y-[1px]' : 'bg-white text-slate-800 hover:bg-slate-50 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('week')}
              className={`px-3 py-1.5 rounded-xl border-2 border-black font-black uppercase text-xs transition-all ${
                 timeRange === 'week' ? 'bg-[#1A1A1A] text-white shadow-none translate-y-[1px]' : 'bg-white text-slate-800 hover:bg-slate-50 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              Esta Semana
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('year')}
              className={`px-3 py-1.5 rounded-xl border-2 border-black font-black uppercase text-xs transition-all ${
                 timeRange === 'year' ? 'bg-[#1A1A1A] text-white shadow-none translate-y-[1px]' : 'bg-white text-slate-800 hover:bg-slate-50 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              Este Año
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 rounded-xl border-2 border-black font-black uppercase text-xs transition-all ${
                 timeRange === 'all' ? 'bg-[#1A1A1A] text-white shadow-none translate-y-[1px]' : 'bg-white text-slate-800 hover:bg-slate-50 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              Histórico
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('custom')}
              className={`px-3 py-1.5 rounded-xl border-2 border-black font-black uppercase text-xs transition-all ${
                 timeRange === 'custom' ? 'bg-[#1A1A1A] text-white shadow-none translate-y-[1px]' : 'bg-white text-slate-800 hover:bg-slate-50 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              Personalizado
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border-2 border-black overflow-x-auto scrollbar-hide">
            <span className="text-[10px] font-black uppercase text-slate-500 px-2 shrink-0">Canal:</span>
            <button
              type="button"
              onClick={() => setSelectedOrderType('all')}
              className={`px-3 py-1.5 rounded-xl border-2 border-black font-black uppercase text-[11px] transition-all whitespace-nowrap ${
                 selectedOrderType === 'all' ? 'bg-black text-[#FFD700] shadow-none translate-y-[1px]' : 'bg-white text-slate-800 hover:bg-slate-50 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              Todos los Tipos
            </button>

            <button
              type="button"
              onClick={() => setSelectedOrderType('pedidos_ya')}
              className={`px-3 py-1.5 rounded-xl border-2 border-black font-black uppercase text-[11px] transition-all whitespace-nowrap flex items-center gap-1 ${
                 selectedOrderType === 'pedidos_ya' ? 'bg-[#B91C1C] text-white shadow-none translate-y-[1px]' : 'bg-red-50 text-red-800 hover:bg-red-100 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              <Bike className="w-3.5 h-3.5" /> PedidosYa ({orderTypeStats.pyCount})
            </button>

            <button
              type="button"
              onClick={() => setSelectedOrderType('rappi')}
              className={`px-3 py-1.5 rounded-xl border-2 border-black font-black uppercase text-[11px] transition-all whitespace-nowrap flex items-center gap-1 ${
                 selectedOrderType === 'rappi' ? 'bg-orange-600 text-white shadow-none translate-y-[1px]' : 'bg-orange-50 text-orange-800 hover:bg-orange-100 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              🧡 Rappi ({orderTypeStats.rappiCount})
            </button>

            <button
              type="button"
              onClick={() => setSelectedOrderType('uber')}
              className={`px-3 py-1.5 rounded-xl border-2 border-black font-black uppercase text-[11px] transition-all whitespace-nowrap flex items-center gap-1 ${
                 selectedOrderType === 'uber' ? 'bg-emerald-950 text-emerald-300 shadow-none translate-y-[1px]' : 'bg-emerald-900 text-emerald-200 hover:bg-emerald-800 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              🟢 Uber ({orderTypeStats.uberCount})
            </button>

            <button
              type="button"
              onClick={() => setSelectedOrderType('domicilio')}
              className={`px-3 py-1.5 rounded-xl border-2 border-black font-black uppercase text-[11px] transition-all whitespace-nowrap flex items-center gap-1 ${
                 selectedOrderType === 'domicilio' ? 'bg-emerald-600 text-white shadow-none translate-y-[1px]' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Domicilio ({orderTypeStats.domicilioCount})
            </button>

            <button
              type="button"
              onClick={() => setSelectedOrderType('mesas')}
              className={`px-3 py-1.5 rounded-xl border-2 border-black font-black uppercase text-[11px] transition-all whitespace-nowrap flex items-center gap-1 ${
                 selectedOrderType === 'mesas' ? 'bg-blue-700 text-white shadow-none translate-y-[1px]' : 'bg-blue-50 text-blue-800 hover:bg-blue-100 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" /> Mesas ({orderTypeStats.mesasCount})
            </button>
          </div>
        </div>
      </div>

      {timeRange === 'custom' && (
        <div className="shrink-0 flex gap-3 items-center overflow-x-auto pb-1 scrollbar-hide">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-xs font-black uppercase">Desde:</span>
            <input 
              type="date" 
              className="outline-none text-sm font-bold bg-transparent"
              value={customDateRange.start}
              onChange={e => setCustomDateRange({ ...customDateRange, start: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-xs font-black uppercase">Hasta:</span>
            <input 
              type="date" 
              className="outline-none text-sm font-bold bg-transparent"
              value={customDateRange.end}
              onChange={e => setCustomDateRange({ ...customDateRange, end: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Top Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 shrink-0">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-full bg-[#1A1A1A] text-[#FFD700] flex items-center justify-center shrink-0">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-wider opacity-60">Ingresos Totales</h3>
          </div>
          <p className="text-xl lg:text-2xl font-black text-[#1A1A1A]">{formatPrice(totalRevenue)}</p>
        </div>
        
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center border-2 border-black shrink-0">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-wider opacity-60">Costo Producción</h3>
          </div>
          <p className="text-xl lg:text-2xl font-black text-slate-600">{formatPrice(totalCost)}</p>
        </div>

        <div className="bg-[#1A1A1A] p-3.5 sm:p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-[#FFD700] flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-full bg-white text-[#1A1A1A] flex items-center justify-center border-2 border-black shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-wider opacity-100 text-white">Ganancia Neta</h3>
          </div>
          <p className="text-xl lg:text-2xl font-black text-[#FFD700]">{formatPrice(totalProfit)}</p>
        </div>

        {/* Tarjeta de Resumen PedidosYa */}
        <div className="bg-red-50 p-3.5 sm:p-4 rounded-2xl border-2 border-red-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-[#B91C1C] text-white flex items-center justify-center border-2 border-black shrink-0">
                <Bike className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-wider text-[#B91C1C]">PedidosYa</h3>
            </div>
            <span className="text-[10px] font-black bg-red-200 text-red-900 px-1.5 py-0.5 rounded-full border border-red-400">{orderTypeStats.pyCount}</span>
          </div>
          <p className="text-xl lg:text-2xl font-black text-[#B91C1C]">{formatPrice(orderTypeStats.pyTotal)}</p>
        </div>

        {/* Tarjeta de Resumen Rappi */}
        <div className="bg-orange-50 p-3.5 sm:p-4 rounded-2xl border-2 border-orange-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-orange-600 text-white flex items-center justify-center border-2 border-black font-black text-[10px] shrink-0">
                🧡
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-wider text-orange-900">Rappi</h3>
            </div>
            <span className="text-[10px] font-black bg-orange-200 text-orange-900 px-1.5 py-0.5 rounded-full border border-orange-400">{orderTypeStats.rappiCount}</span>
          </div>
          <p className="text-xl lg:text-2xl font-black text-orange-900">{formatPrice(orderTypeStats.rappiTotal)}</p>
        </div>

        {/* Tarjeta de Resumen Uber */}
        <div className="bg-emerald-950 p-3.5 sm:p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-black flex items-center justify-center border-2 border-black font-black text-[10px] shrink-0">
                🟢
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Uber Eats</h3>
            </div>
            <span className="text-[10px] font-black bg-emerald-900 text-emerald-200 px-1.5 py-0.5 rounded-full border border-emerald-600">{orderTypeStats.uberCount}</span>
          </div>
          <p className="text-xl lg:text-2xl font-black text-emerald-400">{formatPrice(orderTypeStats.uberTotal)}</p>
        </div>
      </div>

      <div className="shrink-0 xl:flex-1 min-h-[500px] xl:min-h-0 bg-white rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col">
        <div className="p-4 border-b-2 border-black bg-slate-50 rounded-t-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
          <h2 className="font-black uppercase tracking-widest flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#B91C1C]" />
            Actividad {selectedSeller !== 'all' && `(${sellers.find(s => s.id === selectedSeller)?.name || ''})`}
          </h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex bg-white rounded-xl border-2 border-black p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] w-full sm:w-auto">
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg font-black uppercase text-xs flex items-center justify-center gap-2 transition-colors ${
                  viewMode === 'list' ? 'bg-[#FFD700] border-2 border-black' : 'hover:bg-slate-50 border-2 border-transparent opacity-60'
                }`}
              >
                <List className="w-4 h-4" /> Lista
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg font-black uppercase text-xs flex items-center justify-center gap-2 transition-colors ${
                  viewMode === 'chart' ? 'bg-[#FFD700] border-2 border-black' : 'hover:bg-slate-50 border-2 border-transparent opacity-60'
                }`}
              >
                <BarChartIcon className="w-4 h-4" /> Gráfica
              </button>
              <button
                onClick={() => setViewMode('summary')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg font-black uppercase text-xs flex items-center justify-center gap-2 transition-colors ${
                  viewMode === 'summary' ? 'bg-[#FFD700] border-2 border-black' : 'hover:bg-slate-50 border-2 border-transparent opacity-60'
                }`}
              >
                <Package className="w-4 h-4" /> Resumen
              </button>
            </div>
            {viewMode === 'summary' && (
              <button 
                onClick={handleDownloadSummaryPDF} 
                className="bg-[#B91C1C] px-4 py-2 text-white border-2 border-black rounded-xl font-bold uppercase text-xs shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 shrink-0"
                title="Descargar PDF"
              >
                <Download className="w-4 h-4" /> PDF
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-hide">
          {filteredOrders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#1A1A1A] gap-3 opacity-30">
              <FileText className="w-16 h-16 stroke-1" />
              <p className="text-sm font-bold uppercase text-center">No hay ventas<br />registradas aún</p>
            </div>
          ) : viewMode === 'summary' ? (
            <div className="w-full">
              <table className="w-full text-left border-spacing-0" style={{ borderCollapse: 'separate' }}>
                <thead className="sticky top-[-12px] sm:top-[-16px] z-20">
                  <tr className="bg-white">
                    <th className="p-3 border-b-2 border-black font-black uppercase text-xs whitespace-nowrap shadow-[0_2px_0_0_rgba(0,0,0,1)]">Producto</th>
                    <th className="p-3 border-b-2 border-black font-black uppercase text-xs whitespace-nowrap hidden sm:table-cell shadow-[0_2px_0_0_rgba(0,0,0,1)]">Categoría</th>
                    <th className="p-3 border-b-2 border-black font-black uppercase text-xs text-right whitespace-nowrap shadow-[0_2px_0_0_rgba(0,0,0,1)]">Cant.</th>
                    <th className="p-3 border-b-2 border-black font-black uppercase text-xs text-right whitespace-nowrap shadow-[0_2px_0_0_rgba(0,0,0,1)]">Ingreso</th>
                  </tr>
                </thead>
                <tbody>
                  {productSummary.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-sm uppercase border-b-2 border-black/10 bg-inherit">{item.name}</td>
                      <td className="p-3 font-bold text-sm uppercase opacity-60 hidden sm:table-cell border-b-2 border-black/10 bg-inherit">{item.category}</td>
                      <td className="p-3 font-bold text-sm uppercase text-right border-b-2 border-black/10 bg-inherit">{item.quantity}</td>
                      <td className="p-3 font-black text-sm uppercase text-right text-[#FFD700] drop-shadow-[1px_1px_0_rgba(0,0,0,1)] border-b-2 border-black/10 bg-inherit">${item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : viewMode === 'chart' ? (
            <div className="h-full min-h-[300px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#6B7280' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#6B7280' }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px',
                      border: '2px solid black',
                      boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      textTransform: 'uppercase'
                    }}
                    formatter={(value: number) => [`USD/ ${value.toFixed(2)}`, undefined]}
                    cursor={{fill: '#f3f4f6'}}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                  <Bar dataKey="Ingresos" fill="#1A1A1A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ganancia" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredOrders.slice().reverse().map((order) => (
                <div key={order.id} className={`bg-white border-2 border-black rounded-xl p-4 flex flex-col shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative ${order.status === 'voided' ? 'opacity-70 grayscale-[20%]' : ''}`}>
                  
                  {order.status === 'voided' && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 rotate-[-15deg] border-4 border-[#B91C1C] rounded-lg px-4 py-1 text-[#B91C1C] font-black uppercase text-2xl tracking-widest opacity-80 backdrop-blur-sm bg-white/50">
                      Anulada
                    </div>
                  )}

                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#FFD700] border-2 border-black rounded-full flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <FileText className="w-5 h-5 text-[#1A1A1A]" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm uppercase">Pedido #{String(order.orderNumber).padStart(5, '0')}</h4>
                        <p className="text-[10px] font-bold opacity-60">
                          {new Date(order.date).toLocaleString('es-EC', { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                       <p className={`text-lg font-black leading-none border-2 border-black px-2 py-1 rounded-lg ${order.status === 'voided' ? 'line-through bg-slate-200 text-slate-400' : 'bg-slate-100'}`}>{formatPrice(order.total)}</p>
                    </div>
                  </div>
                  
                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-bold mb-4 bg-slate-50 p-2 rounded-lg border-2 border-black/10">
                    <div className="flex flex-col">
                      <span className="opacity-60 uppercase text-[9px] tracking-widest">Items</span>
                      <span>{order.items.length} productos</span>
                    </div>
                    {order.tableNumber && (
                      <div className="flex flex-col">
                        <span className="opacity-60 uppercase text-[9px] tracking-widest">Tipo / Ubicación</span>
                        {(() => {
                          const norm = order.tableNumber.trim().toLowerCase();
                          if (norm === 'pedidosya' || norm === 'pedidos ya' || norm.startsWith('pedidos')) {
                            return (
                              <span className="bg-red-100 text-[#B91C1C] border border-red-300 rounded px-1.5 py-0.5 text-[10px] font-black uppercase w-max flex items-center gap-1">
                                <Bike className="w-3 h-3" /> PedidosYa
                              </span>
                            );
                          }
                          if (norm === 'rappi') {
                            return (
                              <span className="bg-orange-100 text-orange-800 border border-orange-300 rounded px-1.5 py-0.5 text-[10px] font-black uppercase w-max flex items-center gap-1">
                                🧡 Rappi
                              </span>
                            );
                          }
                          if (norm === 'uber' || norm === 'uber eats' || norm.startsWith('uber')) {
                            return (
                              <span className="bg-emerald-950 text-emerald-400 border border-emerald-700 rounded px-1.5 py-0.5 text-[10px] font-black uppercase w-max flex items-center gap-1">
                                🟢 Uber Eats
                              </span>
                            );
                          }
                          if (norm === 'domicilio' || norm === 'para llevar') {
                            return (
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 rounded px-1.5 py-0.5 text-[10px] font-black uppercase w-max flex items-center gap-1">
                                <ShoppingBag className="w-3 h-3" /> Domicilio
                              </span>
                            );
                          }
                          return <span>Mesa {order.tableNumber}</span>;
                        })()}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="opacity-60 uppercase text-[9px] tracking-widest">Sucursal</span>
                      <span className="bg-slate-900 text-[#FFD700] rounded px-1.5 py-0.5 text-[10px] font-black uppercase w-max">
                        📍 {order.branchName || 'Matriz'}
                      </span>
                    </div>
                    {order.customerName && (
                      <div className="flex flex-col col-span-2">
                        <span className="opacity-60 uppercase text-[9px] tracking-widest">Cliente</span>
                        <span className="truncate">{order.customerName}</span>
                      </div>
                    )}
                    {order.sellerName && (
                      <div className="flex flex-col col-span-2 mt-1">
                        <span className="opacity-60 uppercase text-[9px] tracking-widest">Mesero/Vendedor</span>
                        <span className="truncate">{order.sellerName}</span>
                      </div>
                    )}
                    <div className="flex flex-col col-span-2 mt-1 pt-2 border-t-2 border-dashed border-black/10">
                      <span className={`uppercase text-[9px] tracking-widest ${order.status === 'voided' ? 'text-[#B91C1C]' : 'opacity-60'}`}>Ganancia Neta</span>
                      <span className={`font-black ${order.status === 'voided' ? 'text-[#B91C1C] line-through opacity-50' : 'text-black'}`}>{formatPrice(order.profit)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex gap-2 relative z-20">
                    <button 
                      onClick={() => onViewReceipt(order)}
                      className="flex-1 bg-[#1A1A1A] text-[#FFD700] py-3 rounded-xl font-black text-[10px] sm:text-xs uppercase flex items-center justify-center gap-2 hover:bg-black transition-colors active:translate-y-[2px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-black"
                    >
                      <Printer className="w-4 h-4 hidden sm:block" />
                      Ver / Imprimir
                    </button>
                    
                    {order.status !== 'voided' && onVoidOrder && (
                      <button 
                        onClick={() => handleVoidOrderConfirm(order.id)}
                        className="bg-white text-[#B91C1C] px-3 sm:px-4 py-3 rounded-xl font-black flex items-center justify-center hover:bg-red-50 transition-colors active:translate-y-[2px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-[#B91C1C]"
                        title="Anular orden y devolver inventario"
                      >
                        <Ban className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    )}

                    {onDeleteOrder && (
                      <button 
                        onClick={() => handleDeleteOrderConfirm(order.id)}
                        className="bg-white text-[#B91C1C] px-3 sm:px-4 py-3 rounded-xl font-black flex items-center justify-center hover:bg-red-50 transition-colors active:translate-y-[2px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-[#B91C1C]"
                        title="Eliminar orden permanentemente"
                      >
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    )}
                  </div>
                  
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

