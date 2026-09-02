import React, { useState, useMemo } from 'react';
import { TableOrder } from '../types';
import { LayoutGrid, Users, List, Search, Trash2, Clock, DollarSign, ShoppingBag, ArrowRight, Bike } from 'lucide-react';

interface MesasViewProps {
  activeTables: TableOrder[];
  onSelectTable: (tableNumber: string) => void;
  onDeleteTable?: (tableNumber: string) => void;
  totalTables: number;
}

export function MesasView({ activeTables, onSelectTable, onDeleteTable, totalTables }: MesasViewProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  const tables = useMemo(() => Array.from({ length: totalTables }, (_, i) => String(i + 1)), [totalTables]);

  const formatPrice = (price: number) => `USD/ ${price.toFixed(2)}`;

  // Función auxiliar para encontrar orden de mesa estándar
  const findMatchingOrder = (numStr: string) => {
    return activeTables.find(t => {
      const norm = t.tableNumber.trim().toLowerCase();
      return norm === numStr || norm === `mesa ${numStr}` || norm === `m${numStr}`;
    });
  };

  // Calcular comandas personalizadas o fuera de la cuadrícula de 1-30
  const customActiveTables = useMemo(() => {
    return activeTables.filter(t => {
      const norm = t.tableNumber.trim().toLowerCase();
      // Verificar si coincide con alguna mesa 1-30
      const isGridTable = tables.some(numStr => norm === numStr || norm === `mesa ${numStr}` || norm === `m${numStr}`);
      return !isGridTable;
    });
  }, [activeTables, tables]);

  // Total acumulado sin cobrar
  const totalPendingRevenue = useMemo(() => {
    return activeTables.reduce((totalSum, tableOrder) => {
      const tableTotal = (tableOrder.items || []).reduce((sum, item) => sum + ((item.menuItem?.price || 0) * (item.quantity || 0)), 0);
      return totalSum + tableTotal;
    }, 0);
  }, [activeTables]);

  // Filtrar comandas activas para la vista de lista completa
  const filteredActiveTables = useMemo(() => {
    if (!searchTerm.trim()) return activeTables;
    const term = searchTerm.toLowerCase();
    return activeTables.filter(t => 
      t.tableNumber.toLowerCase().includes(term) ||
      (t.sellerName && t.sellerName.toLowerCase().includes(term)) ||
      (t.items && t.items.some(it => it.menuItem?.name?.toLowerCase().includes(term)))
    );
  }, [activeTables, searchTerm]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* Banner Superior & Filtros */}
      <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 shrink-0">
        <div>
          <h2 className="font-black uppercase tracking-widest flex items-center gap-2 text-xl">
            <LayoutGrid className="w-6 h-6 text-[#B91C1C]" />
            Gestión de Mesas y Comandas
          </h2>
          <p className="text-xs font-bold opacity-60 mt-0.5">
            {activeTables.length} {activeTables.length === 1 ? 'comanda abierta' : 'comandas abiertas'} en sistema
          </p>
        </div>

        {/* Accesos Directos a Venta Especial (PedidosYa / Rappi / Uber / Domicilio) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onSelectTable('PedidosYa')}
            className="bg-[#B91C1C] hover:bg-red-800 text-white font-black uppercase text-xs px-3 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 transition-all active:translate-y-[1px]"
            title="Crear pedido directo para PedidosYa (Cobro obligatorio)"
          >
            <Bike className="w-4 h-4 animate-bounce" /> PedidosYa
          </button>

          <button
            onClick={() => onSelectTable('Rappi')}
            className="bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-xs px-3 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 transition-all active:translate-y-[1px]"
            title="Crear pedido directo para Rappi (Cobro obligatorio)"
          >
            🧡 Rappi
          </button>

          <button
            onClick={() => onSelectTable('Uber Eats')}
            className="bg-emerald-800 hover:bg-emerald-900 text-white font-black uppercase text-xs px-3 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 transition-all active:translate-y-[1px]"
            title="Crear pedido directo para Uber Eats (Cobro obligatorio)"
          >
            🟢 Uber Eats
          </button>

          <button
            onClick={() => onSelectTable('Llevar')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs px-3 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 transition-all active:translate-y-[1px]"
            title="Crear pedido directo Llevar"
          >
            <ShoppingBag className="w-4 h-4" /> Llevar
          </button>
        </div>

        {/* Resumen de Total Retenido / Pendiente */}
        {activeTables.length > 0 && (
          <div className="bg-[#FFD700] border-2 border-black rounded-xl px-4 py-2 flex items-center gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div className="w-8 h-8 rounded-full bg-black text-[#FFD700] flex items-center justify-center font-black">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest block opacity-70">Total Pendiente por Cobrar</span>
              <span className="text-lg font-black">{formatPrice(totalPendingRevenue)}</span>
            </div>
          </div>
        )}

        {/* Controles de Modo de Vista */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex bg-slate-100 p-1 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg font-black uppercase text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === 'grid' ? 'bg-[#1A1A1A] text-white border-2 border-black' : 'text-slate-600 hover:text-black'
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> Cuadrícula
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg font-black uppercase text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === 'list' ? 'bg-[#1A1A1A] text-white border-2 border-black' : 'text-slate-600 hover:text-black'
              }`}
            >
              <List className="w-4 h-4" /> Todas las Comandas ({activeTables.length})
            </button>
          </div>

          <div className="hidden sm:flex gap-3 items-center ml-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-black"></div>
              <span className="text-[11px] font-bold uppercase">Libre</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-black"></div>
              <span className="text-[11px] font-bold uppercase">Ocupada</span>
            </div>
          </div>
        </div>
      </div>

      {/* VISTA 1: CUADRÍCULA ESTÁNDAR + COMANDAS ADICIONALES */}
      {viewMode === 'grid' ? (
        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
          {/* Mesas 1 al 30 */}
          <div className="mb-6">
            <h3 className="font-black uppercase text-xs tracking-widest opacity-60 mb-3 flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" /> Mesas Principales (1 - {totalTables})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {tables.map(tableNumber => {
                const tableOrder = findMatchingOrder(tableNumber);
                const isOccupied = !!tableOrder;
                
                const total = isOccupied 
                  ? tableOrder.items.reduce((sum, item) => sum + ((item.menuItem?.price || 0) * (item.quantity || 0)), 0)
                  : 0;

                return (
                  <button
                    key={tableNumber}
                    onClick={() => onSelectTable(tableOrder ? tableOrder.tableNumber : tableNumber)}
                    className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] min-h-[120px] group ${
                      isOccupied ? 'bg-red-50 hover:bg-red-100 border-red-900' : 'bg-green-50 hover:bg-green-100'
                    }`}
                  >
                    <div className={`absolute top-2 right-2 w-3.5 h-3.5 rounded-full border-2 border-black ${isOccupied ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                    
                    <span className="text-3xl font-black mb-1">M{tableNumber}</span>
                    
                    {isOccupied ? (
                      <div className="flex flex-col items-center mt-1">
                        <span className="text-sm font-black text-red-600">{formatPrice(total)}</span>
                        <span className="text-[10px] font-bold uppercase opacity-70 mt-0.5 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {tableOrder.sellerName || 'Ocupada'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold uppercase opacity-60 mt-2">Libre</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sección de Comandas Personalizadas / Para Llevar / Fuera de Cuadrícula */}
          {customActiveTables.length > 0 && (
            <div className="mt-8 pb-20">
              <div className="flex items-center justify-between mb-3 border-t-2 border-dashed border-black/20 pt-6">
                <h3 className="font-black uppercase text-sm tracking-widest text-[#B91C1C] flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" /> Comandas Abiertas / Personalizadas sin Cobrar ({customActiveTables.length})
                </h3>
                <span className="text-xs font-bold opacity-60">Haz clic en cualquiera para cobrar o modificar</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {customActiveTables.map(order => {
                  const total = order.items.reduce((sum, item) => sum + ((item.menuItem?.price || 0) * (item.quantity || 0)), 0);
                  const itemCount = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);

                  return (
                    <div
                      key={order.id || order.tableNumber}
                      className="bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between relative group hover:border-[#B91C1C] transition-all"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-black text-base uppercase text-[#1A1A1A] max-w-[70%] truncate" title={order.tableNumber}>
                            {order.tableNumber}
                          </span>
                          <span className="bg-red-100 text-red-700 font-black text-xs px-2 py-0.5 rounded-full border border-red-300">
                            Pendiente
                          </span>
                        </div>

                        <div className="text-xs font-bold opacity-70 mb-3 space-y-1">
                          {order.sellerName && (
                            <p className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" /> {order.sellerName}
                            </p>
                          )}
                          <p className="flex items-center gap-1.5">
                            <ShoppingBag className="w-3.5 h-3.5" /> {itemCount} productos en orden
                          </p>
                          {order.updatedAt && (
                            <p className="flex items-center gap-1.5 text-[10px] opacity-60">
                              <Clock className="w-3 h-3" /> {new Date(order.updatedAt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t-2 border-black/10 flex items-center justify-between mt-2">
                        <span className="text-lg font-black text-[#B91C1C]">{formatPrice(total)}</span>
                        <div className="flex gap-2">
                          {onDeleteTable && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteTable(order.tableNumber);
                              }}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700 border-2 border-black transition-colors"
                              title="Liberar / Cancelar comanda"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onSelectTable(order.tableNumber)}
                            className="bg-[#1A1A1A] hover:bg-black text-[#FFD700] font-black text-xs uppercase px-3 py-2 rounded-xl border-2 border-black flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none"
                          >
                            Cobrar <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VISTA 2: LISTA COMPLETA DE TODAS LAS COMANDAS ABIERTAS */
        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide flex flex-col pb-20">
          {/* Buscador de Comandas Abiertas */}
          <div className="mb-4 flex gap-3 items-center">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar comanda abierta por nombre de mesa, mesero o platillo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-black font-bold text-sm bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none focus:ring-2 focus:ring-[#FFD700]"
              />
            </div>
            <span className="text-xs font-black uppercase opacity-70 bg-white px-3 py-3 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap">
              Mostrando {filteredActiveTables.length} de {activeTables.length}
            </span>
          </div>

          {filteredActiveTables.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] my-auto">
              <ShoppingBag className="w-16 h-16 opacity-30 mb-3" />
              <h4 className="font-black text-lg uppercase tracking-wider">No hay comandas abiertas que coincidan</h4>
              <p className="text-xs font-bold opacity-60 mt-1">Intenta cambiar la búsqueda o crea una comanda nueva desde el menú.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredActiveTables.map(order => {
                const total = (order.items || []).reduce((sum, item) => sum + ((item.menuItem?.price || 0) * (item.quantity || 0)), 0);
                const itemCount = (order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

                return (
                  <div
                    key={order.id || order.tableNumber}
                    className="bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3 pb-2 border-b-2 border-black/10">
                        <div>
                          <span className="font-black text-lg uppercase block text-[#1A1A1A]">
                            {order.tableNumber}
                          </span>
                          {order.sellerName && (
                            <span className="text-xs font-bold opacity-60 flex items-center gap-1 mt-0.5">
                              <Users className="w-3.5 h-3.5" /> Mesero: {order.sellerName}
                            </span>
                          )}
                        </div>
                        <span className="text-lg font-black text-[#B91C1C] bg-red-50 border-2 border-red-200 px-3 py-1 rounded-xl">
                          {formatPrice(total)}
                        </span>
                      </div>

                      {/* Lista resumida de platillos */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-black/10 mb-4 max-h-[140px] overflow-y-auto scrollbar-hide text-xs space-y-1.5">
                        <span className="font-black uppercase text-[10px] opacity-60 tracking-wider block mb-1">
                          Detalle de la Comanda ({itemCount} ítems):
                        </span>
                        {order.items?.map((it, idx) => (
                          <div key={idx} className="flex justify-between font-bold text-slate-700">
                            <span className="truncate pr-2">{it.quantity}x {it.menuItem?.name}</span>
                            <span className="font-black">{formatPrice((it.menuItem?.price || 0) * (it.quantity || 0))}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t-2 border-black/10">
                      <span className="text-[10px] font-bold opacity-50 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 
                        {order.updatedAt ? new Date(order.updatedAt).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : 'Hora no registrada'}
                      </span>

                      <div className="flex gap-2">
                        {onDeleteTable && (
                          <button
                            onClick={() => onDeleteTable(order.tableNumber)}
                            className="p-2.5 rounded-xl bg-slate-100 hover:bg-red-100 text-slate-700 hover:text-red-700 border-2 border-black transition-colors"
                            title="Liberar / Descartar comanda"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onSelectTable(order.tableNumber)}
                          className="bg-[#FFD700] hover:bg-[#ffdf33] text-black font-black text-xs uppercase px-4 py-2.5 rounded-xl border-2 border-black flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none"
                        >
                          Abrir / Cobrar en POS
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
