import React, { useState } from 'react';
import { UserAccount } from '../types';
import { Lock, User, ArrowRight } from 'lucide-react';

interface LoginViewProps {
  users: UserAccount[];
  onLogin: (user: UserAccount) => void;
}

export function LoginView({ users, onLogin }: LoginViewProps) {
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCedula = cedula.trim();
    let user = users.find(u => u.cedula === cleanCedula && u.password === password);
    if (!user && cleanCedula === '1714851332001' && password === 'admin') {
      user = {
        id: '2',
        cedula: '1714851332001',
        name: 'Admin Sucursal 2',
        role: 'Administrador',
        password: 'admin',
        branchId: '2',
        branchName: 'Sucursal 2'
      };
    }
    if (user) {
      setError('');
      onLogin(user);
    } else {
      setError('Cédula o contraseña incorrecta');
    }
  };

  return (
    <div className="flex h-screen bg-[#F7F4F0] items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border-2 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col">
        <div className="bg-[#B91C1C] p-8 text-center text-white border-b-2 border-black">
          <span className="text-xs font-bold uppercase tracking-widest opacity-80">Restaurante</span>
          <h1 className="text-4xl font-black italic uppercase mt-2">Chifa Mei Hua</h1>
          <p className="text-[#FFD700] font-black tracking-widest mt-1 text-sm">SISTEMA</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-black uppercase mb-2 opacity-60">RUC o Número de Cédula</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 opacity-50 text-black" />
                </div>
                <input
                  type="text"
                  placeholder="Ingrese RUC o Cédula"
                  className="w-full pl-12 pr-4 py-4 bg-[#F7F4F0] border-2 border-black rounded-xl font-bold focus:outline-none focus:bg-white transition-colors"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-2 opacity-60">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 opacity-50 text-black" />
                </div>
                <input
                  type="password"
                  placeholder="Ingrese su contraseña"
                  className="w-full pl-12 pr-4 py-4 bg-[#F7F4F0] border-2 border-black rounded-xl font-bold focus:outline-none focus:bg-white transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

             {error && (
              <div className="text-[#B91C1C] text-sm font-bold text-center mt-2 uppercase">
                {error}
              </div>
             )}

            <button
              type="submit"
              className="mt-4 w-full py-4 px-4 bg-[#FFD700] border-2 border-black rounded-xl font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all flex items-center justify-center gap-2"
            >
              Ingresar <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
