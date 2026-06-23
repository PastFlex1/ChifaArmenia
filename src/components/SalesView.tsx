import React, { useState, useMemo } from 'react';
import { Order, UserAccount } from '../types';
import { FileText, Printer, ChevronRight, TrendingUp, DollarSign, Activity, Users, BarChart as BarChartIcon, List, Trash2, Ban } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

    return filtered;
  }, [orders, selectedSeller, timeRange, customDateRange]);

  const formatPrice = (price: number) => `USD/ ${price.toFixed(2)}`;

  const validOrders = filteredOrders.filter(o => o.status !== 'voided');

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

  return (
    <div className="flex-1 flex flex-col overflow-y-auto xl:overflow-hidden bg-[#F7F4F0] gap-4 pb-[80px] xl:pb-0">
      {/* Filters (Horizontal Top Bar) */}
      <div className="shrink-0 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {currentUser?.role === 'Administrador' && (
          <>
            <button
              onClick={() => setSelectedSeller('all')}
              className={`px-5 py-2.5 rounded-full border-2 border-black font-black uppercase text-xs whitespace-nowrap transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none ${
                selectedSeller === 'all'
                  ? 'bg-[#FFD700] text-black translate-y-[1px] shadow-none'
                  : 'bg-white hover:bg-slate-50'
              }`}
            >
              General (Todos)
            </button>
            {sellers.map((seller) => (
              <button
                key={seller.id}
                onClick={() => setSelectedSeller(seller.id)}
                className={`px-5 py-2.5 rounded-full border-2 border-black font-black uppercase text-xs whitespace-nowrap transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none flex items-center gap-2 ${
                  selectedSeller === seller.id
                    ? 'bg-[#FFD700] text-black translate-y-[1px] shadow-none'
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4" />
                {seller.name}
              </button>
            ))}
            <div className="w-px h-8 bg-black/20 mx-2 self-center shrink-0"></div>
          </>
        )}

        <button
          onClick={() => setTimeRange('all')}
          className={`px-5 py-2.5 rounded-full border-2 border-black font-black uppercase text-xs whitespace-nowrap transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none ${
             timeRange === 'all' ? 'bg-[#1A1A1A] text-white translate-y-[1px] shadow-none' : 'bg-white hover:bg-slate-50'
          }`}
        >
          Histórico
        </button>
        <button
          onClick={() => setTimeRange('day')}
          className={`px-5 py-2.5 rounded-full border-2 border-black font-black uppercase text-xs whitespace-nowrap transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none ${
             timeRange === 'day' ? 'bg-[#1A1A1A] text-white translate-y-[1px] shadow-none' : 'bg-white hover:bg-slate-50'
          }`}
        >
          Hoy
        </button>
        <button
          onClick={() => setTimeRange('week')}
          className={`px-5 py-2.5 rounded-full border-2 border-black font-black uppercase text-xs whitespace-nowrap transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none ${
             timeRange === 'week' ? 'bg-[#1A1A1A] text-white translate-y-[1px] shadow-none' : 'bg-white hover:bg-slate-50'
          }`}
        >
          Esta Semana
        </button>
        <button
          onClick={() => setTimeRange('year')}
          className={`px-5 py-2.5 rounded-full border-2 border-black font-black uppercase text-xs whitespace-nowrap transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none ${
             timeRange === 'year' ? 'bg-[#1A1A1A] text-white translate-y-[1px] shadow-none' : 'bg-white hover:bg-slate-50'
          }`}
        >
          Este Año
        </button>
        <button
          onClick={() => setTimeRange('custom')}
          className={`px-5 py-2.5 rounded-full border-2 border-black font-black uppercase text-xs whitespace-nowrap transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none ${
             timeRange === 'custom' ? 'bg-[#1A1A1A] text-white translate-y-[1px] shadow-none' : 'bg-white hover:bg-slate-50'
          }`}
        >
          Personalizado
        </button>
      </div>

      {timeRange === 'custom' && (
        <div className="shrink-0 flex gap-3 items-center overflow-x-auto pb-2 scrollbar-hide">
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

      {/* Top Stats - Swipeable on mobile */}
      <div className="flex gap-3 sm:gap-4 shrink-0 overflow-x-auto pb-2 scrollbar-hide snap-x">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-w-[240px] flex-1 snap-start flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#1A1A1A] text-[#FFD700] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest opacity-60">Ingresos Totales</h3>
          </div>
          <p className="text-3xl font-black text-[#1A1A1A]">{formatPrice(totalRevenue)}</p>
        </div>
        
        <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-w-[240px] flex-1 snap-start flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center border-2 border-black">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest opacity-60">Costo Producción</h3>
          </div>
          <p className="text-3xl font-black text-slate-600">{formatPrice(totalCost)}</p>
        </div>

        <div className="bg-[#1A1A1A] p-4 sm:p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-w-[240px] flex-1 snap-start text-[#FFD700] flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-white text-[#1A1A1A] flex items-center justify-center border-2 border-black">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest opacity-100 text-white">Ganancia Neta</h3>
          </div>
          <p className="text-3xl font-black text-[#FFD700]">{formatPrice(totalProfit)}</p>
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
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-hide">
          {filteredOrders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#1A1A1A] gap-3 opacity-30">
              <FileText className="w-16 h-16 stroke-1" />
              <p className="text-sm font-bold uppercase text-center">No hay ventas<br />registradas aún</p>
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
                        <span className="opacity-60 uppercase text-[9px] tracking-widest">Mesa</span>
                        <span>{order.tableNumber}</span>
                      </div>
                    )}
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
                  {confirmDeleteId === order.id ? (
                    <div className="mt-auto flex flex-col gap-2">
                       <p className="text-xs text-[#B91C1C] font-bold text-center leading-tight">¿Eliminar nota de venta?</p>
                       <div className="flex gap-2">
                         <button 
                           onClick={() => setConfirmDeleteId(null)}
                           className="flex-1 bg-white text-black py-2 rounded-xl font-black text-xs uppercase hover:bg-slate-50 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-black"
                         >
                           Cancelar
                         </button>
                         <button 
                           onClick={() => {
                             if (onDeleteOrder) {
                               onDeleteOrder(order.id);
                             }
                             setConfirmDeleteId(null);
                           }}
                           className="flex-1 bg-[#B91C1C] text-white py-2 rounded-xl font-black text-xs uppercase hover:bg-red-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-black"
                         >
                           Eliminar
                         </button>
                       </div>
                    </div>
                  ) : (
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
                          onClick={() => {
                            if (window.confirm('¿Está seguro de que desea ANULAR esta orden?\n\nLos productos vendidos regresarán al inventario y los totales se descontarán de las ganancias. Esta acción no se puede deshacer.')) {
                              onVoidOrder(order.id);
                            }
                          }}
                          className="bg-white text-[#B91C1C] px-3 sm:px-4 py-3 rounded-xl font-black flex items-center justify-center hover:bg-red-50 transition-colors active:translate-y-[2px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-[#B91C1C]"
                          title="Anular orden y devolver inventario"
                        >
                          <Ban className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      )}

                      {onDeleteOrder && (
                        <button 
                          onClick={() => setConfirmDeleteId(order.id)}
                          className="bg-white text-[#B91C1C] px-3 sm:px-4 py-3 rounded-xl font-black flex items-center justify-center hover:bg-red-50 transition-colors active:translate-y-[2px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-[#B91C1C]"
                          title="Eliminar orden permanentemente"
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      )}
                    </div>
                  )}
                  
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

