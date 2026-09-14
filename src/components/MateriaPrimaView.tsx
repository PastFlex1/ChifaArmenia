import React, { useState } from 'react';
import { Package, Plus, Trash2, Edit2, Search, X, Download, Copy, Building2 } from 'lucide-react';
import { generateInventoryPDF } from '../utils/pdfGenerator';
import { RawMaterial, getStockForBranch } from '../types';
import { CustomSelect } from './CustomSelect';

export function MateriaPrimaView({ 
  rawMaterials, 
  onAddMaterial,
  onDeleteMaterial,
  currentBranchId = '1',
  currentBranchName,
  onSwitchBranch,
  onCopyStockFromMatriz
}: { 
  rawMaterials: RawMaterial[], 
  onAddMaterial: (r: RawMaterial) => void,
  onDeleteMaterial: (id: string) => void,
  currentBranchId?: string,
  currentBranchName?: string,
  onSwitchBranch?: (branch: '1' | '2') => void,
  onCopyStockFromMatriz?: () => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    unit: 'Kg',
    stock: '',
    unitCost: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.stock || !formData.unitCost) return;
    
    onAddMaterial({
      id: editingId || Date.now().toString(),
      name: formData.name,
      unit: formData.unit,
      stock: Number(formData.stock),
      unitCost: Number(formData.unitCost)
    });

    setFormData({ ...formData, name: '', stock: '', unitCost: '' });
    setEditingId(null);
  };

  const handleEdit = (item: RawMaterial) => {
    setEditingId(item.id);
    const branchStock = getStockForBranch(item, currentBranchId);
    setFormData({
      name: item.name,
      unit: item.unit,
      stock: branchStock.toString(),
      unitCost: item.unitCost.toString()
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', unit: 'Kg', stock: '', unitCost: '' });
  };

  const formatPrice = (p: number) => `USD/ ${p.toFixed(2)}`;

  const filteredMaterials = rawMaterials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const branchLabel = currentBranchName || (currentBranchId === '2' ? 'Sucursal 2 (San Rafael)' : 'Matriz (Armenia)');

  const handleDownloadPDF = () => {
    generateInventoryPDF({
      title: `Inventario de Materias Primas - ${branchLabel}`,
      filename: `materias_primas_${currentBranchId === '2' ? 'sucursal2' : 'matriz'}`,
      columns: ['Nombre', 'Unidad', 'Costo Unit.', 'Stock', 'Costo Total'],
      data: filteredMaterials.map(m => {
        const s = getStockForBranch(m, currentBranchId);
        return [
          m.name,
          m.unit,
          `$${m.unitCost.toFixed(2)}`,
          s.toString(),
          `$${(s * m.unitCost).toFixed(2)}`
        ];
      })
    });
  };

  return (
    <div className="flex w-full h-full gap-4 overflow-y-auto xl:overflow-hidden flex-col xl:flex-row pb-[80px] xl:pb-0">
      {/* Form Container */}
      <div className="w-full xl:w-[400px] flex flex-col gap-4 shrink-0">
        <div className="bg-white p-6 rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col xl:h-full xl:overflow-y-auto scrollbar-hide">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#FFD700] rounded-xl border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Package className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-black italic uppercase">{editingId ? 'Editar Ingrediente' : 'Materia Prima'}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold uppercase opacity-50">{editingId ? 'Editar Ingrediente' : 'Ingreso de Ingredientes'}</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  📍 {branchLabel}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-black uppercase opacity-60">Ingrediente</label>
              <input 
                type="text" 
                required
                placeholder="Ej. Pollo, Arroz, Aceite"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-3 bg-[#F7F4F0] border-2 border-black rounded-xl text-sm font-bold focus:outline-none focus:bg-white uppercase placeholder-opacity-50 transition-colors"
              />
            </div>
            
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-black uppercase opacity-60">Unidad</label>
                <CustomSelect 
                  value={formData.unit}
                  onChange={val => setFormData({ ...formData, unit: val })}
                  options={['Kg', 'Lb', 'L', 'Und', 'Gr', 'Saco', 'Botella']}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-black uppercase opacity-60">
                  Cantidad (Stock {currentBranchId === '2' ? 'San Rafael' : 'Matriz'})
                </label>
                <input 
                  type="number" 
                  step="1"
                  min="0"
                  required
                  placeholder="0"
                  value={formData.stock}
                  onChange={e => setFormData({ ...formData, stock: e.target.value.replace(/[^0-9]/g, '') })}
                  className="w-full px-3 py-3 bg-[#F7F4F0] border-2 border-black rounded-xl text-sm font-bold focus:outline-none focus:bg-white uppercase transition-colors hide-spin-button"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-black uppercase opacity-60">Costo Unitario</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  required
                  placeholder="0.00"
                  value={formData.unitCost}
                  onChange={e => setFormData({ ...formData, unitCost: e.target.value })}
                  className="w-full px-3 py-3 bg-[#F7F4F0] border-2 border-black rounded-xl text-sm font-bold focus:outline-none focus:bg-white uppercase transition-colors hide-spin-button"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button 
                type="submit" 
                className="flex-1 py-3 bg-[#1A1A1A] text-[#FFD700] border-2 border-black rounded-xl font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2"
              >
                {editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingId ? `Guardar en ${currentBranchId === '2' ? 'San Rafael' : 'Matriz'}` : `Agregar a ${currentBranchId === '2' ? 'San Rafael' : 'Matriz'}`}
              </button>
              {editingId && (
                <button 
                  type="button" 
                  onClick={cancelEdit}
                  className="px-4 py-3 bg-white border-2 border-black rounded-xl font-bold uppercase text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Right List */}
      <div className="shrink-0 xl:flex-1 min-h-[500px] xl:min-h-0 bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden">
        <div className="bg-slate-900 text-white p-4 flex flex-col lg:flex-row justify-between items-center z-10 shrink-0 gap-4">
           <div className="flex flex-wrap items-center gap-3">
             <h2 className="font-black uppercase tracking-widest italic shrink-0 flex items-center gap-2">
               Materias Primas
             </h2>
             {onSwitchBranch && (
               <div className="flex gap-1 bg-slate-800 p-1 rounded-xl border border-white/20">
                 <button
                   type="button"
                   onClick={() => onSwitchBranch('1')}
                   className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all ${
                     currentBranchId === '1'
                       ? 'bg-[#FFD700] text-black shadow-sm'
                       : 'text-slate-300 hover:text-white'
                   }`}
                 >
                   📍 Matriz
                 </button>
                 <button
                   type="button"
                   onClick={() => onSwitchBranch('2')}
                   className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all ${
                     currentBranchId === '2'
                       ? 'bg-[#FFD700] text-black shadow-sm'
                       : 'text-slate-300 hover:text-white'
                   }`}
                 >
                   📍 San Rafael
                 </button>
               </div>
             )}
             {onCopyStockFromMatriz && currentBranchId === '2' && (
               <button
                 type="button"
                 onClick={onCopyStockFromMatriz}
                 className="bg-amber-400 hover:bg-amber-300 text-black px-2.5 py-1 rounded-lg font-black uppercase text-[11px] transition-all flex items-center gap-1 shadow-sm active:translate-y-[1px]"
                 title="Copiar stocks de Matriz como base inicial para San Rafael"
               >
                 <Copy className="w-3.5 h-3.5" /> Copiar Base de Matriz
               </button>
             )}
           </div>
           <div className="flex gap-2 w-full lg:w-auto">
             <div className="relative flex-1 lg:w-64">
               <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-black/50" />
               <input
                 type="text"
                 placeholder="Buscar ingrediente..."
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
          {filteredMaterials.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-[#1A1A1A] gap-3 opacity-30">
               <Package className="w-12 h-12 stroke-2" />
               <p className="text-sm font-bold uppercase text-center">Sin ingredientes<br/>registrados o encontrados</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-max content-start">
              {filteredMaterials.map((item) => {
                const currentStock = getStockForBranch(item, currentBranchId);
                const matrizStock = getStockForBranch(item, '1');
                const suc2Stock = getStockForBranch(item, '2');

                return (
                  <div key={item.id} className="bg-white p-4 border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3 group hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
                     <div className="flex justify-between items-start">
                       <h3 className="font-black text-lg uppercase leading-tight line-clamp-2">{item.name}</h3>
                       <div className="flex gap-2 shrink-0 ml-2">
                         <button onClick={() => handleEdit(item)} className="w-8 h-8 rounded-lg border-2 border-black bg-white flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none" title="Editar stock para esta sucursal">
                            <Edit2 className="w-4 h-4" />
                         </button>
                         <button onClick={() => onDeleteMaterial(item.id)} className="w-8 h-8 rounded-lg border-2 border-black bg-white flex items-center justify-center text-[#B91C1C] hover:bg-red-50 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none">
                            <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                     </div>
                     <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t-2 border-dashed border-black/20">
                       <div>
                         <span className="block text-[10px] uppercase font-bold text-[#B91C1C]">Stock {currentBranchId === '2' ? 'San Rafael' : 'Matriz'}</span>
                         <span className="font-black text-xl text-black">
                           {Number.isInteger(currentStock) ? currentStock : (Math.round(currentStock * 1000) / 1000)} <span className="text-sm opacity-60">{item.unit}</span>
                         </span>
                       </div>
                       <div>
                         <span className="block text-[10px] uppercase font-bold opacity-50">Costo Unit.</span>
                         <span className="font-black text-sm block mt-1">{formatPrice(item.unitCost)}/{item.unit}</span>
                       </div>
                     </div>
                     <div className="bg-slate-100 p-2 rounded-lg border border-slate-300 text-[10px] font-bold flex justify-between items-center text-slate-700">
                       <span>📍 Matriz: <strong className={currentBranchId === '1' ? 'text-[#B91C1C]' : 'text-black'}>{matrizStock} {item.unit}</strong></span>
                       <span>📍 San Rafael: <strong className={currentBranchId === '2' ? 'text-[#B91C1C]' : 'text-black'}>{suc2Stock} {item.unit}</strong></span>
                     </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
