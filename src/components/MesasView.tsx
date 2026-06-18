import React from 'react';
import { TableOrder } from '../types';
import { LayoutGrid, Users } from 'lucide-react';

interface MesasViewProps {
  activeTables: TableOrder[];
  onSelectTable: (tableNumber: string) => void;
  totalTables: number;
}

export function MesasView({ activeTables, onSelectTable, totalTables }: MesasViewProps) {
  const tables = Array.from({ length: totalTables }, (_, i) => String(i + 1));

  const formatPrice = (price: number) => `USD/ ${price.toFixed(2)}`;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center mb-4 shrink-0">
        <h2 className="font-black uppercase tracking-widest flex items-center gap-2 text-xl">
          <LayoutGrid className="w-6 h-6 text-[#B91C1C]" />
          Gestión de Mesas
        </h2>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-black"></div>
            <span className="text-xs font-bold uppercase">Libre</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-black"></div>
            <span className="text-xs font-bold uppercase">Ocupada</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-20">
          {tables.map(tableNumber => {
            const tableOrder = activeTables.find(t => t.tableNumber === tableNumber);
            const isOccupied = !!tableOrder;
            
            const total = isOccupied 
              ? tableOrder.items.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0)
              : 0;

            return (
              <button
                key={tableNumber}
                onClick={() => onSelectTable(tableNumber)}
                className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] min-h-[120px] group ${
                  isOccupied ? 'bg-red-50 hover:bg-red-100' : 'bg-green-50 hover:bg-green-100'
                }`}
              >
                <div className={`absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-black ${isOccupied ? 'bg-red-500' : 'bg-green-500'}`}></div>
                
                <span className="text-3xl font-black mb-1">M{tableNumber}</span>
                
                {isOccupied ? (
                  <div className="flex flex-col items-center mt-2">
                    <span className="text-sm font-black text-red-600">{formatPrice(total)}</span>
                    <span className="text-[10px] font-bold uppercase opacity-60 mt-1 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Ocupada
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
    </div>
  );
}
