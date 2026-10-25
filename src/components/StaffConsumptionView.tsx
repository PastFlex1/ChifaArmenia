import React, { useState, useMemo } from 'react';
import { UserAccount, StaffConsumption, MenuItem } from '../types';
import { 
  Users, 
  Plus, 
  Trash2, 
  Search, 
  X, 
  Download, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  UtensilsCrossed, 
  AlertCircle,
  FileText,
  BadgeAlert,
  ArrowUpDown
} from 'lucide-react';
import { generateInventoryPDF } from '../utils/pdfGenerator';
import Swal from 'sweetalert2';

interface StaffConsumptionViewProps {
  consumptions: StaffConsumption[];
  users: UserAccount[];
  posItems?: MenuItem[];
  currentUser: UserAccount | null;
  currentBranchId: '1' | '2';
  currentBranchName?: string;
  onSwitchBranch?: (branch: '1' | '2') => void;
  onAddConsumption: (consumption: StaffConsumption) => Promise<void>;
  onUpdateConsumptionStatus: (id: string, status: 'pending' | 'deducted') => Promise<void>;
  onDeleteConsumption: (id: string) => Promise<void>;
  onSettleWorkerConsumptions: (workerId: string) => Promise<void>;
}

export function StaffConsumptionView({
  consumptions,
  users,
  posItems = [],
  currentUser,
  currentBranchId,
  currentBranchName,
  onSwitchBranch,
  onAddConsumption,
  onUpdateConsumptionStatus,
  onDeleteConsumption,
  onSettleWorkerConsumptions
}: StaffConsumptionViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'deducted'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State para registrar nuevo consumo
  const [formWorkerId, setFormWorkerId] = useState('');
  const [formConceptType, setFormConceptType] = useState<'menu' | 'manual'>('menu');
  const [formManualDesc, setFormManualDesc] = useState('');
  const [formManualAmount, setFormManualAmount] = useState('');
  const [formSelectedItems, setFormSelectedItems] = useState<{ id: string; name: string; price: number; quantity: number }[]>([]);
  const [formMenuSearch, setFormMenuSearch] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const branchLabel = currentBranchName || (currentBranchId === '2' ? 'San Rafael' : 'Armenia');

  // Filtrar trabajadores de la sucursal actual
  const branchWorkers = useMemo(() => {
    return users.filter(user => {
      if (user.id === '1') return currentBranchId === '1';
      if (user.id === '2' || user.cedula === '1714851332001') return currentBranchId === '2';
      const uBranch = user.branchId || '1';
      return uBranch === currentBranchId;
    });
  }, [users, currentBranchId]);

  // Filtrar consumos de la sucursal actual
  const branchConsumptions = useMemo(() => {
    return consumptions.filter(c => {
      const cBranch = c.branchId || '1';
      return cBranch === currentBranchId;
    });
  }, [consumptions, currentBranchId]);

  // Totales generales
  const stats = useMemo(() => {
    let pendingTotal = 0;
    let deductedTotal = 0;
    const workersWithPending = new Set<string>();

    branchConsumptions.forEach(c => {
      if (c.status === 'pending') {
        pendingTotal += Number(c.total) || 0;
        workersWithPending.add(c.workerId);
      } else {
        deductedTotal += Number(c.total) || 0;
      }
    });

    return {
      pendingTotal,
      deductedTotal,
      pendingWorkersCount: workersWithPending.size,
      totalCount: branchConsumptions.length
    };
  }, [branchConsumptions]);

  // Resumen por trabajador
  const workerBalances = useMemo(() => {
    return branchWorkers.map(w => {
      const workerCons = branchConsumptions.filter(c => c.workerId === w.id);
      const pendingSum = workerCons
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + (Number(c.total) || 0), 0);
      const deductedSum = workerCons
        .filter(c => c.status === 'deducted')
        .reduce((sum, c) => sum + (Number(c.total) || 0), 0);
      return {
        worker: w,
        pendingTotal: pendingSum,
        deductedTotal: deductedSum,
        count: workerCons.length,
        pendingCount: workerCons.filter(c => c.status === 'pending').length
      };
    });
  }, [branchWorkers, branchConsumptions]);

  // Consumos filtrados para la lista
  const filteredConsumptions = useMemo(() => {
    return branchConsumptions.filter(c => {
      if (selectedWorkerFilter !== 'all' && c.workerId !== selectedWorkerFilter) {
        return false;
      }
      if (statusFilter !== 'all' && c.status !== statusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchWorker = c.workerName?.toLowerCase().includes(query) || c.workerCedula?.includes(query);
        const matchNotes = c.notes?.toLowerCase().includes(query);
        const matchItems = c.items?.some(i => i.name.toLowerCase().includes(query));
        if (!matchWorker && !matchNotes && !matchItems) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [branchConsumptions, selectedWorkerFilter, statusFilter, searchTerm]);

  // Manejar creación de consumo
  const handleOpenModal = (preselectedWorkerId?: string) => {
    setFormWorkerId(preselectedWorkerId || (branchWorkers[0]?.id || ''));
    setFormConceptType('menu');
    setFormManualDesc('');
    setFormManualAmount('');
    setFormSelectedItems([]);
    setFormMenuSearch('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleAddItemFromMenu = (item: MenuItem) => {
    setFormSelectedItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const handleRemoveItem = (id: string) => {
    setFormSelectedItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSaveConsumption = async (e: React.FormEvent) => {
    e.preventDefault();
    const worker = branchWorkers.find(w => w.id === formWorkerId);
    if (!worker) {
      Swal.fire('Error', 'Selecciona un trabajador válido', 'error');
      return;
    }

    let itemsToSave: { name: string; quantity: number; price: number }[] = [];
    let totalToSave = 0;

    if (formConceptType === 'menu') {
      if (formSelectedItems.length === 0) {
        Swal.fire('Atención', 'Agrega al menos un plato o bebida consumida', 'warning');
        return;
      }
      itemsToSave = formSelectedItems.map(i => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price
      }));
      totalToSave = formSelectedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    } else {
      const amount = parseFloat(formManualAmount);
      if (!amount || amount <= 0 || !formManualDesc.trim()) {
        Swal.fire('Atención', 'Ingresa una descripción y un monto válido mayor a 0', 'warning');
        return;
      }
      itemsToSave = [{
        name: formManualDesc.trim(),
        quantity: 1,
        price: Number(amount.toFixed(2))
      }];
      totalToSave = Number(amount.toFixed(2));
    }

    const newConsumption: StaffConsumption = {
      id: `staff_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      workerId: worker.id,
      workerName: worker.name,
      workerCedula: worker.cedula,
      date: new Date().toISOString(),
      items: itemsToSave,
      total: Number(totalToSave.toFixed(2)),
      notes: formNotes.trim() || undefined,
      status: 'pending',
      branchId: currentBranchId,
      branchName: branchLabel
    };

    try {
      await onAddConsumption(newConsumption);
      setIsModalOpen(false);
      Swal.fire({
        title: '¡Registrado!',
        text: `Consumo de $${newConsumption.total.toFixed(2)} registrado para ${worker.name}.`,
        icon: 'success',
        timer: 1800,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', 'No se pudo registrar el consumo.', 'error');
    }
  };

  // Liquidar / Descontar todo de un trabajador
  const handleSettleWorker = async (worker: UserAccount, pendingAmount: number) => {
    if (pendingAmount <= 0) {
      Swal.fire('Sin saldo pendiente', `${worker.name} no tiene consumos pendientes por descontar.`, 'info');
      return;
    }

    const result = await Swal.fire({
      title: '¿Liquidar consumos de trabajador?',
      html: `<p>Se marcarán como <b>DESCONTADOS</b> todos los consumos pendientes de <b>${worker.name}</b> por un total de <b>$${pendingAmount.toFixed(2)}</b>.</p><p style="font-size: 11px; color: #666; margin-top: 8px;">Usa esta opción cuando descuentes este monto en su rol de pagos o quincena.</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#1A1A1A',
      confirmButtonText: 'Sí, Marcar Descontado',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await onSettleWorkerConsumptions(worker.id);
        Swal.fire({
          title: '¡Descuento Liquidado!',
          text: `Se liquidaron $${pendingAmount.toFixed(2)} de ${worker.name}.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'No se pudo liquidar los consumos.', 'error');
      }
    }
  };

  // Toggle estado de un consumo
  const handleToggleStatus = async (item: StaffConsumption) => {
    const nextStatus = item.status === 'pending' ? 'deducted' : 'pending';
    const actionLabel = nextStatus === 'deducted' ? 'descontado en el rol de pagos' : 'pendiente de descuento';
    
    const result = await Swal.fire({
      title: `¿Cambiar estado?`,
      text: `El consumo de $${Number(item.total).toFixed(2)} de ${item.workerName} pasará a estar "${actionLabel}".`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#000',
      cancelButtonColor: '#777',
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      await onUpdateConsumptionStatus(item.id, nextStatus);
    }
  };

  // Eliminar consumo
  const handleDelete = async (id: string, workerName: string, amount: number) => {
    const result = await Swal.fire({
      title: '¿Eliminar este consumo?',
      text: `Se eliminará el registro de $${amount.toFixed(2)} de ${workerName}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#B91C1C',
      cancelButtonColor: '#1A1A1A',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      await onDeleteConsumption(id);
      Swal.fire({
        title: 'Eliminado',
        text: 'Registro eliminado exitosamente.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  // Descargar PDF
  const handleDownloadPDF = () => {
    const rows = filteredConsumptions.map(c => {
      const itemsText = c.items?.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Consumo';
      const formattedDate = new Date(c.date).toLocaleString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      return [
        formattedDate,
        c.workerName,
        c.workerCedula || 'S/N',
        itemsText + (c.notes ? ` (Nota: ${c.notes})` : ''),
        `$${Number(c.total || 0).toFixed(2)}`,
        c.status === 'pending' ? 'PENDIENTE' : 'DESCONTADO'
      ];
    });

    generateInventoryPDF({
      title: `Descuentos por Consumo a Trabajadores - ${branchLabel}`,
      filename: `descuentos_trabajadores_${currentBranchId === '2' ? 'san_rafael' : 'armenia'}`,
      columns: ['Fecha', 'Trabajador', 'Cédula', 'Detalle Consumo', 'Total', 'Estado'],
      data: rows
    });
  };

  return (
    <div className="flex flex-col w-full h-full gap-4 overflow-y-auto scrollbar-hide pb-16 xl:pb-0">
      {/* Header bar */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-10 h-10 bg-[#FFD700] rounded-xl border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <UtensilsCrossed className="w-5 h-5 text-black" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-black italic uppercase leading-none">
              Consumo de Trabajadores
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold uppercase opacity-60">Control y descuento de comida de personal</span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                📍 {branchLabel}
              </span>
            </div>
          </div>
          {onSwitchBranch && (
            <div className="flex gap-1 bg-slate-800 p-1 rounded-xl border border-white/20 ml-2">
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
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => handleOpenModal()}
            className="flex-1 md:flex-none px-4 py-2.5 bg-[#FFD700] text-black border-2 border-black rounded-xl font-black uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Registrar Consumo
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={filteredConsumptions.length === 0}
            className="px-4 py-2.5 bg-[#B91C1C] text-white border-2 border-black rounded-xl font-black uppercase text-xs shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            title="Descargar Reporte en PDF"
          >
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div className="flex items-center justify-between opacity-60">
            <span className="text-[10px] font-black uppercase tracking-wider">Por Descontar</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-[#B91C1C]">
              ${stats.pendingTotal.toFixed(2)}
            </span>
            <span className="block text-[10px] font-bold text-slate-500 uppercase mt-0.5">Pendiente en roles</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div className="flex items-center justify-between opacity-60">
            <span className="text-[10px] font-black uppercase tracking-wider">Ya Descontado</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-600">
              ${stats.deductedTotal.toFixed(2)}
            </span>
            <span className="block text-[10px] font-bold text-slate-500 uppercase mt-0.5">Cobrado / Liquidado</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div className="flex items-center justify-between opacity-60">
            <span className="text-[10px] font-black uppercase tracking-wider">Con Saldo</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-black">
              {stats.pendingWorkersCount} <span className="text-sm font-bold opacity-50">/ {branchWorkers.length}</span>
            </span>
            <span className="block text-[10px] font-bold text-slate-500 uppercase mt-0.5">Trabajadores con deuda</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div className="flex items-center justify-between opacity-60">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Registros</span>
            <FileText className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-black">
              {stats.totalCount}
            </span>
            <span className="block text-[10px] font-bold text-slate-500 uppercase mt-0.5">Comidas registradas</span>
          </div>
        </div>
      </div>

      {/* Workers summary cards carousel/grid */}
      <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3 shrink-0">
        <div className="flex justify-between items-center">
          <span className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-[#B91C1C]" /> Saldos por Trabajador ({branchWorkers.length})
          </span>
          {selectedWorkerFilter !== 'all' && (
            <button
              onClick={() => setSelectedWorkerFilter('all')}
              className="text-[11px] font-black uppercase text-blue-600 hover:underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Quitar filtro de trabajador
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
          {workerBalances.map(({ worker, pendingTotal, deductedTotal, count, pendingCount }) => {
            const isSelected = selectedWorkerFilter === worker.id;
            return (
              <div
                key={worker.id}
                className={`p-3.5 rounded-xl border-2 border-black transition-all flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? 'bg-amber-50 ring-2 ring-[#B91C1C] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-[#F7F4F0] hover:bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="font-black text-sm uppercase truncate text-black">{worker.name}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-bold text-slate-500">C.I. {worker.cedula}</span>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-slate-200 text-slate-800">
                        {worker.role}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    pendingTotal > 0
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}>
                    {pendingTotal > 0 ? 'Con Saldo' : 'Al Día'}
                  </span>
                </div>

                <div className="bg-white p-2 rounded-lg border border-black/20 flex justify-between items-center text-xs">
                  <div>
                    <span className="block text-[9px] font-bold uppercase opacity-50">Por Descontar</span>
                    <span className="font-black text-base text-[#B91C1C]">${pendingTotal.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] font-bold uppercase opacity-50">Historial Total</span>
                    <span className="font-bold text-xs opacity-75">${(pendingTotal + deductedTotal).toFixed(2)} ({count})</span>
                  </div>
                </div>

                <div className="flex gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedWorkerFilter(isSelected ? 'all' : worker.id)}
                    className={`flex-1 py-1 px-2 rounded-lg font-bold text-[10px] uppercase border border-black transition-all ${
                      isSelected ? 'bg-black text-white' : 'bg-white hover:bg-slate-100 text-black'
                    }`}
                  >
                    {isSelected ? 'Mostrando Todos' : `Ver ${pendingCount} Pend.`}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenModal(worker.id)}
                    className="py-1 px-2 bg-[#FFD700] hover:bg-yellow-400 text-black rounded-lg font-black text-[10px] uppercase border border-black transition-all flex items-center justify-center gap-0.5"
                    title="Añadir consumo a este trabajador"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" /> Consumo
                  </button>
                  {pendingTotal > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSettleWorker(worker, pendingTotal)}
                      className="py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-[10px] uppercase border border-black transition-all"
                      title="Liquidar todos los consumos pendientes de este trabajador"
                    >
                      Liquidar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main List & Filters */}
      <div className="flex-1 bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3 min-h-[400px] overflow-hidden">
        {/* Filters bar */}
        <div className="flex flex-col md:flex-row gap-2 justify-between items-center shrink-0">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/50" />
            <input
              type="text"
              placeholder="Buscar por trabajador, plato o nota..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#F7F4F0] border-2 border-black rounded-xl text-xs font-bold focus:outline-none focus:bg-white uppercase transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {/* Status Tabs */}
            <div className="flex bg-[#F7F4F0] p-1 rounded-xl border-2 border-black gap-1">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all ${
                  statusFilter === 'all' ? 'bg-black text-white' : 'text-slate-600 hover:text-black'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all ${
                  statusFilter === 'pending' ? 'bg-amber-400 text-black shadow-sm' : 'text-slate-600 hover:text-black'
                }`}
              >
                🟡 Pendientes
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('deducted')}
                className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all ${
                  statusFilter === 'deducted' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 hover:text-black'
                }`}
              >
                🟢 Descontados
              </button>
            </div>

            {/* Worker select filter */}
            <select
              value={selectedWorkerFilter}
              onChange={e => setSelectedWorkerFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#F7F4F0] border-2 border-black rounded-xl text-xs font-bold uppercase focus:outline-none focus:bg-white"
            >
              <option value="all">👥 Todos los trabajadores</option>
              {branchWorkers.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Consumptions List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-2.5 pr-1">
          {filteredConsumptions.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
              <UtensilsCrossed className="w-12 h-12 stroke-1 opacity-50" />
              <p className="text-sm font-bold uppercase">No hay consumos registrados con estos filtros</p>
              <button
                type="button"
                onClick={() => handleOpenModal()}
                className="mt-2 px-4 py-2 bg-black text-[#FFD700] rounded-xl font-bold uppercase text-xs"
              >
                Registrar primer consumo
              </button>
            </div>
          ) : (
            filteredConsumptions.map(item => {
              const formattedDate = new Date(item.date).toLocaleString('es-EC', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              const isPending = item.status === 'pending';

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border-2 border-black flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-all ${
                    isPending
                      ? 'bg-amber-50/60 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-white opacity-85 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-xl border-2 border-black flex items-center justify-center shrink-0 ${
                      isPending ? 'bg-amber-300 text-black' : 'bg-emerald-200 text-emerald-900'
                    }`}>
                      {isPending ? <Clock className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-sm uppercase text-black">{item.workerName}</span>
                        <span className="text-[10px] font-bold text-slate-500">📅 {formattedDate}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isPending 
                            ? 'bg-amber-100 text-amber-900 border-amber-300' 
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}>
                          {isPending ? 'Pendiente por descontar' : 'Ya descontado'}
                        </span>
                      </div>

                      {/* Items details */}
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {item.items && item.items.length > 0 ? (
                          item.items.map((it, idx) => (
                            <span key={idx} className="inline-flex items-center text-[11px] font-bold bg-white px-2 py-0.5 rounded border border-black/20 text-slate-800">
                              <strong className="text-[#B91C1C] mr-1">{it.quantity}x</strong> {it.name} (${Number(it.price).toFixed(2)})
                            </span>
                          ))
                        ) : (
                          <span className="text-xs font-bold text-slate-600">Consumo general</span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-[11px] font-medium text-slate-600 mt-1 italic">
                          Nota: "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-black/10">
                    <div className="text-left md:text-right">
                      <span className="block text-[9px] font-bold uppercase opacity-50">Monto</span>
                      <span className="font-black text-lg text-[#B91C1C]">${Number(item.total).toFixed(2)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        className={`px-3 py-1.5 rounded-lg border-2 border-black font-black uppercase text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all ${
                          isPending
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                            : 'bg-amber-300 hover:bg-amber-400 text-black'
                        }`}
                        title={isPending ? 'Marcar como ya descontado del rol' : 'Revertir a pendiente'}
                      >
                        {isPending ? '✓ Descontar' : '↺ Pendiente'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.workerName, item.total)}
                        className="w-8 h-8 rounded-lg border-2 border-black bg-white hover:bg-red-50 text-[#B91C1C] flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL REGISTRAR CONSUMO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#F7F4F0] rounded-3xl w-full max-w-lg overflow-hidden border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col relative animate-fade-in-up max-h-[90vh]">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full border-2 border-black hover:bg-slate-100 transition-colors z-10"
            >
              <X className="w-5 h-5 pointer-events-none" />
            </button>

            <div className="bg-[#1A1A1A] text-[#FFD700] p-5 border-b-4 border-black relative">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-75">Personal • {branchLabel}</span>
              <h2 className="text-xl font-black italic uppercase leading-none mt-1">Registrar Consumo</h2>
            </div>

            <form onSubmit={handleSaveConsumption} className="p-5 overflow-y-auto flex flex-col gap-4">
              {/* Seleccionar Trabajador */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-black uppercase opacity-75">Trabajador a Descontar</label>
                <select
                  required
                  value={formWorkerId}
                  onChange={e => setFormWorkerId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border-2 border-black rounded-xl text-sm font-bold uppercase focus:outline-none"
                >
                  {branchWorkers.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} — {w.role} (C.I. {w.cedula})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de modo: Menú vs Monto Libre */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-black uppercase opacity-75">Tipo de Registro</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormConceptType('menu')}
                    className={`py-2 px-3 rounded-xl border-2 border-black font-black text-xs uppercase transition-all ${
                      formConceptType === 'menu' ? 'bg-[#FFD700] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-slate-600'
                    }`}
                  >
                    Platos / Bebidas del Menú
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormConceptType('manual')}
                    className={`py-2 px-3 rounded-xl border-2 border-black font-black text-xs uppercase transition-all ${
                      formConceptType === 'manual' ? 'bg-[#FFD700] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-slate-600'
                    }`}
                  >
                    Monto Libre / Manual
                  </button>
                </div>
              </div>

              {/* Si es del menú */}
              {formConceptType === 'menu' ? (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black uppercase opacity-75">Seleccionar Platos / Bebidas</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/50" />
                    <input
                      type="text"
                      placeholder="Buscar plato o bebida..."
                      value={formMenuSearch}
                      onChange={e => setFormMenuSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold uppercase focus:outline-none"
                    />
                  </div>

                  {/* Resultados de búsqueda rápida */}
                  {formMenuSearch.trim() && (
                    <div className="max-h-36 overflow-y-auto bg-white border-2 border-black rounded-xl p-1 flex flex-col gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      {posItems
                        .filter(i => i.name.toLowerCase().includes(formMenuSearch.toLowerCase()))
                        .slice(0, 6)
                        .map(item => (
                          <div
                            key={item.id}
                            onClick={() => {
                              handleAddItemFromMenu(item);
                              setFormMenuSearch('');
                            }}
                            className="px-2.5 py-1.5 rounded-lg hover:bg-slate-100 flex justify-between items-center cursor-pointer text-xs font-bold uppercase transition-colors"
                          >
                            <span>{item.name}</span>
                            <span className="text-[#B91C1C]">${item.price.toFixed(2)} +</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Items seleccionados */}
                  <div className="bg-white p-2.5 rounded-xl border-2 border-black border-dashed min-h-[90px] flex flex-col gap-1.5">
                    {formSelectedItems.length === 0 ? (
                      <span className="text-xs font-bold text-slate-400 uppercase text-center my-auto">
                        Busca arriba y haz clic para agregar productos
                      </span>
                    ) : (
                      formSelectedItems.map(item => (
                        <div key={item.id} className="flex justify-between items-center bg-[#F7F4F0] p-1.5 rounded-lg text-xs font-bold">
                          <span className="uppercase">{item.quantity}x {item.name} (${(item.price * item.quantity).toFixed(2)})</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-600 hover:text-red-800 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Total de items */}
                  {formSelectedItems.length > 0 && (
                    <div className="flex justify-between items-center px-1 font-black uppercase text-sm">
                      <span>Total Consumido:</span>
                      <span className="text-[#B91C1C] text-base">
                        ${formSelectedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Monto libre manual */
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-black uppercase opacity-75">Descripción / Concepto</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Almuerzo del día, Colación, Plato personal"
                      value={formManualDesc}
                      onChange={e => setFormManualDesc(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border-2 border-black rounded-xl text-sm font-bold uppercase focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-black uppercase opacity-75">Monto a Descontar ($ USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={formManualAmount}
                      onChange={e => setFormManualAmount(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border-2 border-black rounded-xl text-sm font-bold focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Notas opcionales */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-black uppercase opacity-75">Observaciones / Notas (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. Turno de almuerzo, acordado con administración"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-xs font-bold uppercase focus:outline-none"
                />
              </div>

              {/* Botón enviar */}
              <button
                type="submit"
                className="w-full py-3 bg-[#1A1A1A] text-[#FFD700] border-2 border-black rounded-xl font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none transition-all mt-2"
              >
                Guardar Consumo para Descuento
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
