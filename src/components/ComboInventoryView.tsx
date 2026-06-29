import React, { useState } from 'react';
import { Layers, Plus, Trash2, Edit2, Search, X, Download } from 'lucide-react';
import { generateInventoryPDF } from '../utils/pdfGenerator';
import { Category, Dish, Drink } from '../types';
import { CustomSelect } from './CustomSelect';

interface ComboItem {
  itemId: string;
  type: 'dish' | 'drink';
  quantity: number;
}

interface Combo {
  id: string;
  name: string;
  category: Category | 'Combos';
  price: number;
  items: ComboItem[];
}

interface ComboInventoryViewProps {
  combos: Combo[];
  dishes: Dish[];
  drinks: Drink[];
  onAddCombo: (combo: Combo) => void;
  onDeleteCombo: (id: string) => void;
}

export function ComboInventoryView({
  combos,
  dishes,
  drinks,
  onAddCombo,
  onDeleteCombo
}: ComboInventoryViewProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Combos' as Category | 'Combos',
    price: ''
  });

  const [currentItems, setCurrentItems] = useState<ComboItem[]>([]);
  const [selectedItemType, setSelectedItemType] = useState<'dish' | 'drink'>('dish');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddItem = () => {
    if (!selectedItemId || !itemQuantity) return;
    const qty = Number(itemQuantity);
    if (qty <= 0) return;

    setCurrentItems(prev => {
      const existing = prev.find(item => item.itemId === selectedItemId && item.type === selectedItemType);
      if (existing) {
        return prev.map(item =>
          (item.itemId === selectedItemId && item.type === selectedItemType) 
            ? { ...item, quantity: item.quantity + qty } 
            : item
        );
      }
      return [...prev, { itemId: selectedItemId, type: selectedItemType, quantity: qty }];
    });
    setSelectedItemId('');
    setItemQuantity('');
  };

  const handRemoveItem = (id: string, type: 'dish' | 'drink') => {
    setCurrentItems(prev => prev.filter(item => !(item.itemId === id && item.type === type)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || currentItems.length === 0) return;
    
    onAddCombo({
      id: editingId || Date.now().toString(),
      name: formData.name,
      category: formData.category,
      price: Number(formData.price),
      items: currentItems,
    });

    setFormData({ name: '', category: 'Combos', price: '' });
    setCurrentItems([]);
    setEditingId(null);
  };

  const handleEdit = (combo: Combo) => {
    setEditingId(combo.id);
    setFormData({
      name: combo.name,
      category: combo.category,
      price: combo.price.toString()
    });
    setCurrentItems([...combo.items]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', category: 'Combos', price: '' });
    setCurrentItems([]);
  };

  const formatPrice = (p: number) => `USD/ ${p.toFixed(2)}`;

  const getItemName = (id: string, type: 'dish' | 'drink') => {
    if (type === 'dish') {
      return dishes.find(d => d.id === id)?.name || 'Platillo desconocido';
    }
    return drinks.find(d => d.id === id)?.name || 'Bebida desconocida';
  };

  const filteredCombos = combos.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadPDF = () => {
    generateInventoryPDF({
      title: 'Inventario de Combos',
      filename: 'combos',
      columns: ['Nombre', 'Precio', 'Items'],
      data: filteredCombos.map(c => [
        c.name,
        `$${c.price.toFixed(2)}`,
        c.items.map(i => `${i.quantity}x ${getItemName(i.itemId, i.type)}`).join(', ')
      ])
    });
  };

  return (
    <div className="flex w-full h-full gap-4 overflow-y-auto xl:overflow-hidden flex-col xl:flex-row pb-[80px] xl:pb-0">
      {/* LEFT COLUMN: Add/Edit Combo Form */}
      <div className="w-full xl:w-[450px] shrink-0 flex flex-col gap-4">
        <div className="bg-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col xl:h-full xl:overflow-y-auto scrollbar-hide">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-black/10">
            <div className="bg-[#B91C1C] p-2 rounded-xl text-white">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black italic uppercase leading-tight">
                {editingId ? 'Editar Combo' : 'Nuevo Combo'}
              </h2>
              <span className="text-[10px] font-bold uppercase opacity-50 block">Agrega platos y bebidas</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-black uppercase mb-1">Nombre del Combo</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border-2 border-black rounded-xl font-bold uppercase text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-y-[2px] focus:shadow-none transition-all"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase mb-1">Categoría</label>
                <div className="shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl">
                  <CustomSelect
                    value={formData.category}
                    onChange={val => setFormData({...formData, category: val as Category | 'Combos'})}
                    options={['Combos Familiares', 'Combos Ideales', 'Porciones', 'Chaulafan y Arroz', 'Tallarines y Mixto', 'Bebidas']}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1">Precio Venta</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full px-3 py-2 border-2 border-black rounded-xl font-bold uppercase text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-y-[2px] focus:shadow-none transition-all"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                />
              </div>
            </div>

            {/* Ingredients Section */}
            <div className="mt-4 p-4 bg-slate-50 border-2 border-black rounded-xl">
              <label className="block text-xs font-black uppercase mb-3">Artículos del Combo</label>
              
              <div className="flex gap-2 mb-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl">
                 <CustomSelect
                    value={selectedItemType === 'dish' ? 'Plato' : 'Bebida'}
                    onChange={(val) => {
                       setSelectedItemType(val === 'Plato' ? 'dish' : 'drink');
                       setSelectedItemId('');
                       setItemQuantity('');
                    }}
                    options={['Plato', 'Bebida']}
                 />
              </div>

              <div className="flex gap-2 mb-3 relative">
                <div className="flex-1 min-w-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl">
                  <CustomSelect
                      value={selectedItemId ? getItemName(selectedItemId, selectedItemType) : 'SELECCIONE...'}
                      onChange={(val) => {
                         if (selectedItemType === 'dish') {
                           const d = dishes.find(x => x.name === val);
                           if (d) setSelectedItemId(d.id);
                         } else {
                           const d = drinks.find(x => x.name === val);
                           if (d) setSelectedItemId(d.id);
                         }
                      }}
                      options={selectedItemType === 'dish' ? dishes.map(d => d.name) : drinks.map(d => d.name)}
                  />
                </div>

                <input 
                  type="number"
                  min="0.1"
                  step="any"
                  placeholder="Cant"
                  className="w-20 px-2 py-2 border-2 border-black rounded-lg text-xs font-bold uppercase text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-y-[2px] focus:shadow-none transition-all"
                  value={itemQuantity}
                  onChange={e => setItemQuantity(e.target.value)}
                />
                
                <button 
                  type="button"
                  onClick={handleAddItem}
                  className="w-10 bg-[#FFD700] border-2 border-black rounded-lg flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-2 mt-4 max-h-[150px] overflow-y-auto pr-1">
                {currentItems.length === 0 ? (
                  <p className="text-[10px] uppercase font-bold text-center opacity-40 py-2 border-2 border-dashed border-black/20 rounded-lg">
                    Sin artículos
                  </p>
                ) : (
                  currentItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-2 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase leading-tight line-clamp-1">{getItemName(item.itemId, item.type)}</span>
                        <span className="text-[10px] font-black text-[#B91C1C]">Cant: {item.quantity}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handRemoveItem(item.itemId, item.type)}
                        className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-md border-2 border-transparent hover:border-red-200 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-2 pt-4 border-t-2 border-black/10">
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-3 border-2 border-black rounded-xl font-bold uppercase text-xs hover:bg-slate-50 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={currentItems.length === 0 || !formData.name || !formData.price}
                className="flex-1 bg-[#B91C1C] text-white py-3 rounded-xl font-black uppercase text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-800 transition-all active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingId ? 'Guardar Cambios' : 'Crear Combo'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: Combos List */}
      <div className="shrink-0 xl:flex-1 min-h-[500px] xl:min-h-0 bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden">
        <div className="p-4 border-b-2 border-black bg-slate-50 flex justify-between items-center shrink-0">
          <div className="relative w-72">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input 
              type="text" 
              placeholder="Buscar combo..." 
              className="w-full pl-10 pr-4 py-2.5 border-2 border-black rounded-xl font-bold uppercase text-xs focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
             onClick={handleDownloadPDF} 
             className="bg-[#B91C1C] px-4 py-2 border-2 border-black rounded-xl text-white font-bold uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 shrink-0"
             title="Descargar PDF"
           >
             <Download className="w-4 h-4" /> PDF
           </button>
          <div className="bg-[#FFD700] px-3 py-1.5 rounded-lg border-2 border-black font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            Total: {filteredCombos.length}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-[#F7F4F0]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCombos.map(combo => (
              <div key={combo.id} className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-black uppercase leading-tight line-clamp-1 text-lg">{combo.name}</h3>
                      <span className="text-[10px] font-bold uppercase opacity-50 bg-slate-100 px-2 py-0.5 rounded-full border border-black/20 mt-1 inline-block">{combo.category}</span>
                    </div>
                    <span className="text-xl font-black bg-[#FFD700] px-2 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      {formatPrice(combo.price)}
                    </span>
                  </div>
                  
                  <div className="mt-3 bg-slate-50 p-2 rounded-lg border-2 border-black/10">
                    <span className="text-[10px] font-black uppercase opacity-60 mb-1 block">Artículos:</span>
                    <div className="flex flex-col gap-1 max-h-[80px] overflow-y-auto">
                      {combo.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="font-bold uppercase truncate pr-2">{getItemName(item.itemId, item.type)}</span>
                          <span className="font-black shrink-0">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t-2 border-black/10">
                  <button 
                    onClick={() => handleEdit(combo)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 border-2 border-black rounded-lg font-bold text-xs uppercase transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
                  >
                    <Edit2 className="w-4 h-4" /> Editar
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm('¿Eliminar este combo?')) {
                        onDeleteCombo(combo.id);
                      }
                    }}
                    className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 border-2 border-black rounded-lg transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            
            {filteredCombos.length === 0 && (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-center opacity-40">
                <Layers className="w-12 h-12 mb-3" />
                <span className="font-black uppercase text-sm tracking-widest">No hay combos registrados</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
