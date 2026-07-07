import React, { useState } from 'react';
import { CupSoda, Plus, Trash2, Edit2, Search, X, Download } from 'lucide-react';
import { generateInventoryPDF } from '../utils/pdfGenerator';
import { Drink, Category } from '../types';

export function DrinkInventoryView({ 
  drinks, 
  onAddDrink,
  onDeleteDrink
}: { 
  drinks: Drink[], 
  onAddDrink: (d: Drink) => void,
  onDeleteDrink: (id: string) => void
}) {
  const [formData, setFormData] = useState<{
    name: string;
    stock: string;
    unitCost: string;
    price: string;
    category: Category;
  }>({
    name: '',
    stock: '',
    unitCost: '',
    price: '',
    category: 'Licor'
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.stock || !formData.price || !formData.unitCost) return;
    
    onAddDrink({
      id: editingId || Date.now().toString(),
      name: formData.name,
      category: formData.category,
      stock: Number(formData.stock),
      unitCost: Number(formData.unitCost),
      price: Number(formData.price)
    });

    setFormData({ name: '', stock: '', unitCost: '', price: '', category: 'Licor' });
    setEditingId(null);
  };

  const handleEdit = (item: Drink) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      stock: item.stock.toString(),
      unitCost: item.unitCost.toString(),
      price: item.price.toString(),
      category: (item.category === 'Bebidas Calientes' || item.category === 'Licor' || item.category === 'Jugos' || item.category === 'Bebidas') ? item.category : 'Licor'
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', stock: '', unitCost: '', price: '', category: 'Licor' });
  };

  const formatPrice = (p: number) => `USD/ ${p.toFixed(2)}`;

  const filteredDrinks = drinks.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadPDF = () => {
    generateInventoryPDF({
      title: 'Inventario de Bebidas',
      filename: 'bebidas',
      columns: ['Nombre', 'Categoría', 'Costo', 'Precio', 'Stock'],
      data: filteredDrinks.map(d => [
        d.name,
        d.category,
        `$${d.unitCost.toFixed(2)}`,
        `$${d.price.toFixed(2)}`,
        d.stock.toString()
      ])
    });
  };

  return (
    <div className="flex w-full h-full gap-4 overflow-y-auto xl:overflow-hidden flex-col xl:flex-row pb-[80px] xl:pb-0">
      {/* Form Container */}
      <div className="w-full xl:w-[400px] flex flex-col gap-4 shrink-0">
        <div className="bg-white p-6 rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col xl:h-full xl:overflow-y-auto scrollbar-hide">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-500 rounded-xl border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-white">
              <CupSoda className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black italic uppercase">{editingId ? 'Editar Bebida' : 'Inv. Bebidas'}</h2>
              <span className="text-[10px] font-bold uppercase opacity-50">{editingId ? 'Editar Bebida' : 'Ingreso de Bebidas'}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-black uppercase opacity-60">Bebida / Refresco</label>
              <input 
                type="text" required placeholder="Ej. Inka Kola 1.5L" value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-3 bg-[#F7F4F0] border-2 border-black rounded-xl text-sm font-bold focus:outline-none focus:bg-white uppercase placeholder-opacity-50 transition-colors"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-black uppercase opacity-60">Tipo de Bebida</label>
              <select 
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value as Category })}
                className="w-full px-3 py-3 bg-[#F7F4F0] border-2 border-black rounded-xl text-sm font-bold focus:outline-none focus:bg-white uppercase transition-colors"
              >
                <option value="Licor">Licor</option>
                <option value="Bebidas Calientes">Bebidas Calientes</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Jugos">Jugos</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-black uppercase opacity-60">Cantidad (Stock)</label>
              <input 
                type="number" step="1" min="0" required placeholder="0" value={formData.stock}
                onChange={e => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-3 py-3 bg-[#F7F4F0] border-2 border-black rounded-xl text-sm font-bold focus:outline-none focus:bg-white uppercase transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-black uppercase opacity-60">Costo Unit.</label>
                <input 
                  type="number" step="0.01" min="0" required placeholder="0.00" value={formData.unitCost}
                  onChange={e => setFormData({ ...formData, unitCost: e.target.value })}
                  className="w-full px-3 py-3 bg-[#F7F4F0] border-2 border-black rounded-xl text-sm font-bold focus:outline-none focus:bg-white uppercase transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-black uppercase opacity-60">Precio Venta</label>
                <input 
                  type="number" step="0.01" min="0" required placeholder="0.00" value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-3 bg-[#F7F4F0] border-2 border-black rounded-xl text-sm font-bold focus:outline-none focus:bg-white uppercase transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <button type="submit" className="flex items-center justify-center gap-2 py-4 bg-blue-600 text-white border-2 border-black rounded-xl font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                {editingId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {editingId ? 'Actualizar Bebida' : 'Añadir Bebida'}
              </button>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="bg-white border-2 border-black text-black py-4 font-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 transition-colors uppercase flex items-center justify-center gap-2">
                  <X className="w-5 h-5" /> Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
      {/* Right List */}
      <div className="shrink-0 xl:flex-1 min-h-[500px] xl:min-h-0 bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden">
        <div className="bg-slate-900 text-white p-4 flex flex-col lg:flex-row justify-between items-center z-10 shrink-0 gap-4">
           <h2 className="font-black uppercase tracking-widest italic shrink-0">Inventario Bebidas</h2>
           <div className="flex gap-2 w-full lg:w-auto">
             <div className="relative flex-1 lg:w-64">
               <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-black/50" />
               <input
                 type="text"
                 placeholder="Buscar bebida..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 border-2 border-black rounded-xl font-bold text-sm text-black uppercase focus:outline-none focus:ring-2 focus:ring-white transition-all bg-white"
               />
             </div>
             <button 
               onClick={handleDownloadPDF} 
               className="bg-[#B91C1C] px-4 py-2 border-2 border-black rounded-xl font-bold uppercase text-xs shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 shrink-0"
               title="Descargar PDF"
             >
               <Download className="w-4 h-4" /> PDF
             </button>
           </div>
        </div>
        <div className="flex-1 p-6 overflow-y-auto bg-[#F7F4F0] scrollbar-hide">
          {filteredDrinks.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-[#1A1A1A] gap-3 opacity-30">
               <CupSoda className="w-12 h-12 stroke-2" />
               <p className="text-sm font-bold uppercase text-center">Sin bebidas<br/>registradas o encontradas</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-max content-start">
              {filteredDrinks.map((item) => (
                <div key={item.id} className="bg-white p-4 border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3 group hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
                   <div className="flex justify-between items-start">
                     <div>
                       <h3 className="font-black text-lg uppercase leading-tight line-clamp-2">{item.name}</h3>
                       <span className="text-[10px] font-bold text-blue-600 uppercase border border-blue-600 px-1 rounded">{item.category}</span>
                     </div>
                     <div className="flex gap-2 shrink-0 ml-2">
                       <button onClick={() => handleEdit(item)} className="w-8 h-8 rounded-lg border-2 border-black bg-white flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none">
                          <Edit2 className="w-4 h-4" />
                       </button>
                       <button onClick={() => onDeleteDrink(item.id)} className="w-8 h-8 rounded-lg border-2 border-black bg-white flex items-center justify-center text-[#B91C1C] hover:bg-red-50 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none">
                          <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
                   <div className="grid grid-cols-3 gap-2 mt-auto pt-3 border-t-2 border-dashed border-black/20">
                     <div>
                       <span className="block text-[10px] uppercase font-bold opacity-50">Stock</span>
                       <span className="font-black text-lg">{item.stock} <span className="text-sm opacity-60">u</span></span>
                     </div>
                     <div>
                       <span className="block text-[10px] uppercase font-bold opacity-50">Costo</span>
                       <span className="font-black text-lg block mt-1 text-slate-600">{formatPrice(item.unitCost)}</span>
                     </div>
                     <div>
                       <span className="block text-[10px] uppercase font-bold opacity-50">Precio Venta</span>
                       <span className="font-black text-lg block mt-1 text-[#B91C1C]">{formatPrice(item.price)}</span>
                     </div>
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
