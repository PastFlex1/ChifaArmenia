import React, { useState } from 'react';
import { UserAccount, Role } from '../types';
import { Users, UserPlus, Trash2, Shield, Edit2, X, Save } from 'lucide-react';
import Swal from 'sweetalert2';

interface UsersViewProps {
  users: UserAccount[];
  currentUser?: UserAccount | null;
  onAddUser: (user: UserAccount) => void;
  onDeleteUser: (id: string) => void;
}

export function UsersView({ users, currentUser, onAddUser, onDeleteUser }: UsersViewProps) {
  const [cedula, setCedula] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('Mesero');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedula || !name || !password) return;
    
    // Check if cedula exists and we are not editing THAT same user
    if (!editingId && users.some(u => u.cedula === cedula)) {
      Swal.fire({ title: 'Error', text: 'Ya existe un usuario con esta cédula', icon: 'error', confirmButtonColor: '#000' });
      return;
    }

    if (editingId && users.some(u => u.cedula === cedula && u.id !== editingId)) {
      Swal.fire({ title: 'Error', text: 'La cédula ya está asignada a otro usuario', icon: 'error', confirmButtonColor: '#000' });
      return;
    }

    const currentBranchId = currentUser?.branchId || (currentUser?.cedula === '1714851332001' ? '2' : '1');
    const currentBranchName = (currentBranchId === '2' || currentUser?.branchName === 'Sucursal 2' || currentUser?.branchName === 'San Rafael') ? 'San Rafael' : 'Armenia';

    onAddUser({
      id: editingId || Date.now().toString(),
      cedula,
      name,
      password,
      role,
      branchId: currentBranchId,
      branchName: currentBranchName
    });

    if (editingId) {
      Swal.fire({ title: '¡Actualizado!', text: 'Trabajador actualizado exitosamente', icon: 'success', confirmButtonColor: '#000', timer: 2000 });
    } else {
      Swal.fire({ title: '¡Creado!', text: 'Trabajador creado exitosamente', icon: 'success', confirmButtonColor: '#000', timer: 2000 });
    }

    handleCancel();
  };

  const currentBranchId = currentUser?.branchId || (currentUser?.cedula === '1714851332001' ? '2' : '1');
  const currentBranchName = (currentBranchId === '2' || currentUser?.branchName === 'Sucursal 2' || currentUser?.branchName === 'San Rafael') ? 'San Rafael' : 'Armenia';

  const branchUsers = React.useMemo(() => {
    return users.filter(user => {
      if (user.id === '1') return currentBranchId === '1';
      if (user.id === '2' || user.cedula === '1714851332001') return currentBranchId === '2';
      const uBranch = user.branchId || '1';
      return uBranch === currentBranchId;
    });
  }, [users, currentBranchId]);

  const handleEdit = (user: UserAccount) => {
    setEditingId(user.id);
    setCedula(user.cedula);
    setName(user.name);
    setPassword(user.password || '');
    setRole(user.role);
  };

  const handleCancel = () => {
    setEditingId(null);
    setCedula('');
    setName('');
    setPassword('');
    setRole('Mesero');
  };

  const handleDelete = (id: string, userName: string) => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Seguro que quieres eliminar a ${userName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#B91C1C',
      cancelButtonColor: '#000',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        onDeleteUser(id);
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto xl:overflow-hidden pb-[80px] xl:pb-0">
      <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4 shrink-0 transition-colors duration-300" style={editingId ? { backgroundColor: '#FFD700', borderColor: '#B91C1C' } : {}}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-black uppercase tracking-widest flex items-center gap-2">
            {editingId ? <Edit2 className="w-5 h-5 text-[#B91C1C]" /> : <UserPlus className="w-5 h-5 text-[#B91C1C]" />}
            {editingId ? `Editar Trabajador (${currentBranchName})` : `Nuevo Trabajador (${currentBranchName})`}
          </h2>
          {editingId && (
            <button onClick={handleCancel} className="bg-white border-2 border-black rounded-lg p-1 hover:bg-slate-200">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="RUC / Cédula"
            className="w-full px-3 py-2 bg-[#F7F4F0] border-2 border-black rounded-lg text-sm font-bold focus:outline-none focus:bg-white uppercase"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Nombre"
            className="w-full px-3 py-2 bg-[#F7F4F0] border-2 border-black rounded-lg text-sm font-bold focus:outline-none focus:bg-white uppercase"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Contraseña"
            className="w-full px-3 py-2 bg-[#F7F4F0] border-2 border-black rounded-lg text-sm font-bold focus:outline-none focus:bg-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <select
            className="w-full px-3 py-2 bg-[#F7F4F0] border-2 border-black rounded-lg text-sm font-bold focus:outline-none focus:bg-white uppercase"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="Mesero">Mesero</option>
            <option value="Cajero">Cajero</option>
            <option value="Administrador">Administrador</option>
          </select>
          <button
            type="submit"
            className={`w-full py-2 border-2 border-black rounded-lg font-black uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 ${editingId ? 'bg-black text-[#FFD700]' : 'bg-[#FFD700] text-black'}`}
          >
            {editingId ? <><Save className="w-4 h-4" /> Guardar</> : <><UserPlus className="w-4 h-4" /> Registrar</>}
          </button>
        </form>
      </div>

      <div className="shrink-0 md:flex-1 min-h-[500px] md:min-h-0 bg-white rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col">
        <div className="p-4 border-b-2 border-black bg-slate-50 rounded-t-2xl flex justify-between items-center shrink-0">
          <h2 className="font-black uppercase tracking-widest flex items-center gap-2">
            <Users className="w-5 h-5 text-[#B91C1C]" />
            Personal - {currentBranchName}
          </h2>
          <span className="text-sm font-bold bg-white px-3 py-1 border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {branchUsers.length} Registros
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branchUsers.map((user) => (
              <div key={user.id} className="bg-white border-2 border-black rounded-xl p-4 flex flex-col gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] relative">
                 {user.role === 'Administrador' && (
                  <div className="absolute -top-3 -right-3 bg-[#B91C1C] text-white p-1.5 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <Shield className="w-4 h-4" />
                  </div>
                 )}
                 <div>
                   <h3 className="font-black uppercase text-lg leading-tight">{user.name}</h3>
                   <p className="text-xs font-bold opacity-60 uppercase">C.C: {user.cedula}</p>
                 </div>
                 
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border border-black ${
                        user.role === 'Administrador' ? 'bg-[#FFD700] text-black' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {user.role}
                      </span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border border-black bg-slate-900 text-white">
                        📍 {(user.branchId === '2' || user.branchName === 'Sucursal 2' || user.branchName === 'San Rafael') ? 'San Rafael' : 'Armenia'}
                      </span>
                    </div>
                   
                   <div className="flex gap-2">
                     {user.id !== '1' && user.id !== '2' && user.cedula !== '0923809529001' && user.cedula !== '1714851332001' && (
                       <button
                         onClick={() => handleEdit(user)}
                         className="bg-slate-100 hover:bg-slate-200 p-2 rounded-lg border-2 border-black text-black active:translate-y-[1px] transition-all"
                         title="Editar Trabajador"
                       >
                         <Edit2 className="w-4 h-4" />
                       </button>
                     )}
                     {user.id !== '1' && user.id !== '2' && user.cedula !== '0923809529001' && user.cedula !== '1714851332001' && users.length > 1 && (
                       <button
                         onClick={() => handleDelete(user.id, user.name)}
                         className="bg-red-100 hover:bg-red-200 p-2 rounded-lg border-2 border-black text-black active:translate-y-[1px] transition-all"
                         title="Eliminar Trabajador"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     )}
                   </div>
                 </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
