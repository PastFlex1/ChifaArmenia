import React, { useState } from 'react';
import { ChefHat, Plus, Trash2, Edit2, Search, X } from 'lucide-react';
import { Dish, Category, RawMaterial, RecipeIngredient } from '../types';
import { CustomSelect } from './CustomSelect';

interface DishInventoryViewProps {
  dishes: Dish[];
  rawMaterials: RawMaterial[];
  onAddDish: (dish: Dish) => void;
  onDeleteDish: (id: string) => void;
}

export function DishInventoryView({ 
  dishes, 
  rawMaterials, 
  onAddDish, 
  onDeleteDish 
}: DishInventoryViewProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Comidas' as Category,
    price: ''
  });
  
  const [currentIngredients, setCurrentIngredients] = useState<RecipeIngredient[]>([]);
  const [selectedRM, setSelectedRM] = useState('');
  const [ingQuantity, setIngQuantity] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermIng, setSearchTermIng] = useState('');
  const [ingDropdownOpen, setIngDropdownOpen] = useState(false);

  const handleAddIngredient = () => {
    if (!selectedRM || !ingQuantity) return;
    const qty = Number(ingQuantity);
    if (qty <= 0) return;

    setCurrentIngredients(prev => {
      const existing = prev.find(ing => ing.rawMaterialId === selectedRM);
      if (existing) {
         return prev.map(ing => 
           ing.rawMaterialId === selectedRM ? { ...ing, quantity: ing.quantity + qty } : ing
         );
      }
      return [...prev, { rawMaterialId: selectedRM, quantity: qty }];
    });
    setSelectedRM('');
    setIngQuantity('');
    setSearchTermIng('');
  };

  const handRemoveIngredient = (id: string) => {
    setCurrentIngredients(prev => prev.filter(ing => ing.rawMaterialId !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || currentIngredients.length === 0) return;
    
    onAddDish({
      id: editingId || Date.now().toString(),
      name: formData.name,
      category: formData.category,
      price: Number(formData.price),
      ingredients: currentIngredients,
    });

    setFormData({ name: '', category: 'Comidas', price: '' });
    setCurrentIngredients([]);
    setEditingId(null);
  };

  const handleEdit = (item: Dish) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price.toString()
    });
    setCurrentIngredients([...item.ingredients]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', category: 'Comidas', price: '' });
    setCurrentIngredients([]);
  };

  const formatPrice = (p: number) => `USD/ ${p.toFixed(2)}`;

  const calculateCost = (ingredients: RecipeIngredient[]) => {
    return ingredients.reduce((total, ing) => {
      const rm = rawMaterials.find(r => r.id === ing.rawMaterialId);
      if (rm) {
        return total + (ing.quantity * rm.unitCost);
      }
      return total;
    }, 0);
  };

  const filteredDishes = dishes.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex w-full h-full gap-4 overflow-hidden flex-col md:flex-row">
      <div className="w-full md:w-[450px] flex flex-col gap-4 overflow-hidden shrink-0">
        <div className="bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 overflow-y-auto scrollbar-hide">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#FFD700] rounded-xl border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black italic uppercase">{editingId ? 'Editar Platillo' : 'Inv. Comida'}</h2>
              <span className="text-[10px] font-bold uppercase opacity-50">{editingId ? 'Editar Platillo' : 'Recetas y Costos'}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-black uppercase opacity-60">Nombre del Platillo</label>
              <input
                type="text" required placeholder="Ej. Arroz Chaufa" value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-black rounded-xl font-bold uppercase text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700] transition-all bg-[#F7F4F0]"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-black uppercase opacity-60">Precio Venta (USD/)</label>
                <input
                  type="number" step="0.10" min="0.1" required placeholder="0.00" value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-black rounded-xl font-bold uppercase text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700] transition-all bg-[#F7F4F0]"
                />
              </div>
            </div>

            <div className="border-t-2 border-dashed border-black/20 mt-2 pt-4">
               <label className="text-xs font-black uppercase opacity-60 mb-2 block">Ingredientes de la Receta</label>
               <div className="flex flex-col gap-2 p-3 bg-slate-50 border-2 border-black rounded-xl border-dashed">
                 <div className="flex gap-2">
                   <div className="relative w-full">
                     <input 
                       type="text"
                       placeholder="Buscar ingrediente..."
                       value={searchTermIng}
                       onChange={e => {
                         setSearchTermIng(e.target.value);
                         setIngDropdownOpen(true);
                         const exactMatch = rawMaterials.find(rm => `${rm.name} (${rm.unit})`.toLowerCase() === e.target.value.trim().toLowerCase());
                         if (exactMatch) {
                            setSelectedRM(exactMatch.id);
                         } else {
                            setSelectedRM('');
                         }
                       }}
                       onFocus={() => setIngDropdownOpen(true)}
                       onBlur={() => setTimeout(() => setIngDropdownOpen(false), 200)}
                       className="w-full px-2 py-2 border-2 border-black rounded-lg font-bold text-xs uppercase"
                     />
                     {ingDropdownOpen && (
                       <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-30 max-h-40 overflow-y-auto">
                         {rawMaterials
                           .filter(rm => `${rm.name} (${rm.unit})`.toLowerCase().includes(searchTermIng.toLowerCase()))
                           .map(rm => (
                           <div 
                             key={rm.id}
                             onMouseDown={() => {
                               setSelectedRM(rm.id);
                               setSearchTermIng(`${rm.name} (${rm.unit})`);
                               setIngDropdownOpen(false);
                             }}
                             className="px-2 py-2 text-xs font-bold uppercase cursor-pointer hover:bg-[#1A1A1A] hover:text-white transition-colors"
                           >
                             {rm.name} ({rm.unit})
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                   <input 
                     type="number" step="0.01" min="0.01" placeholder="Cant." value={ingQuantity}
                     onChange={e => setIngQuantity(e.target.value)}
                     className="w-24 px-2 py-2 border-2 border-black rounded-lg font-bold text-xs uppercase"
                   />
                   <button type="button" onClick={handleAddIngredient} className="bg-black text-white px-3 border-2 border-black rounded-lg font-bold hover:bg-[#FFD700] hover:text-black transition-colors shrink-0">
                     +
                   </button>
                 </div>
                 
                 {currentIngredients.length > 0 && (
                   <div className="mt-2 flex flex-col gap-1 max-h-40 overflow-y-auto">
                     {currentIngredients.map((ing, idx) => {
                       const rm = rawMaterials.find(r => r.id === ing.rawMaterialId);
                       if (!rm) return null;
                       return (
                         <div key={idx} className="flex justify-between items-center bg-white p-2 border-2 border-black rounded-lg text-xs font-bold uppercase">
                           <span>{rm.name} ({ing.quantity} {rm.unit})</span>
                           <button type="button" onClick={() => handRemoveIngredient(rm.id)} className="text-red-600 hover:opacity-50">
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                       )
                     })}
                   </div>
                 )}
                 {currentIngredients.length === 0 && (
                   <p className="text-[10px] uppercase font-bold text-center opacity-40 mt-1">
                     Añade ingredientes para calcular costos
                   </p>
                 )}
               </div>
            </div>
            
            <div className="bg-slate-900 text-white p-4 rounded-xl border-2 border-black mt-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center">
               <span className="text-xs uppercase font-bold">Costo Receta Calculado</span>
               <span className="font-black text-lg text-[#FFD700]">{formatPrice(calculateCost(currentIngredients))}</span>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <button 
                type="submit" 
                disabled={currentIngredients.length === 0}
                className="flex items-center justify-center gap-2 py-4 bg-orange-500 text-white border-2 border-black rounded-xl font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 disabled:grayscale"
              >
                {editingId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {editingId ? 'Actualizar Platillo' : 'Registrar Platillo'}
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

      <div className="flex-1 bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden">
        <div className="bg-slate-900 text-white p-4 flex flex-col lg:flex-row justify-between items-center z-10 shrink-0 gap-4">
           <h2 className="font-black uppercase tracking-widest italic shrink-0">Menú / Platillos</h2>
           <div className="relative w-full max-w-md">
             <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-black/50" />
             <input
               type="text"
               placeholder="Buscar platillo..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 border-2 border-black rounded-xl font-bold text-sm text-black uppercase focus:outline-none focus:ring-2 focus:ring-white transition-all bg-white"
             />
           </div>
        </div>
        <div className="flex-1 p-6 overflow-y-auto bg-[#F7F4F0] scrollbar-hide">
          {filteredDishes.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-[#1A1A1A] gap-3 opacity-30">
               <ChefHat className="w-12 h-12 stroke-2" />
               <p className="text-sm font-bold uppercase text-center">Sin platillos<br/>registrados o encontrados</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-max content-start">
              {filteredDishes.map((item) => (
                <div key={item.id} className="bg-white p-4 border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3 group hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
                   <div className="flex justify-between items-start">
                     <div>
                       <h3 className="font-black text-lg uppercase leading-tight line-clamp-2">{item.name}</h3>
                     </div>
                     <div className="flex gap-2 shrink-0 ml-2">
                       <button onClick={() => handleEdit(item)} className="w-8 h-8 rounded-lg border-2 border-black bg-white flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none">
                          <Edit2 className="w-4 h-4" />
                       </button>
                       <button onClick={() => onDeleteDish(item.id)} className="w-8 h-8 rounded-lg border-2 border-black bg-white flex items-center justify-center text-[#B91C1C] hover:bg-red-50 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none">
                          <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
                   
                   <div className="bg-slate-50 border-2 border-black border-dashed rounded-lg p-2 text-[10px] font-bold uppercase flex flex-col gap-1 max-h-24 overflow-y-auto">
                      <span className="opacity-50">Ingredientes:</span>
                      {item.ingredients.map((ing, i) => {
                        const rm = rawMaterials.find(r => r.id === ing.rawMaterialId);
                        return (
                          <div key={i} className="flex justify-between">
                            <span>{rm?.name || '??'}</span>
                            <span>{ing.quantity} {rm?.unit || ''}</span>
                          </div>
                        )
                      })}
                   </div>

                   <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t-2 border-dashed border-black/20">
                     <div>
                       <span className="block text-[10px] uppercase font-bold opacity-50">Costo</span>
                       <span className="font-black text-sm text-[#B91C1C]">{formatPrice(calculateCost(item.ingredients))}</span>
                     </div>
                     <div className="text-right">
                       <span className="block text-[10px] uppercase font-bold opacity-50">Precio</span>
                       <span className="font-black text-lg text-green-700">{formatPrice(item.price)}</span>
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
