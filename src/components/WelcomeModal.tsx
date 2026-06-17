import React, { useEffect } from 'react';
import { UserAccount } from '../types';
import { ChefHat, ArrowRight } from 'lucide-react';

interface Props {
  user: UserAccount;
  onClose: () => void;
}

export function WelcomeModal({ user, onClose }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white border-2 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-sm w-full text-center flex flex-col items-center animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-[#FFD700] border-2 border-black rounded-full flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <ChefHat className="w-10 h-10 text-[#1A1A1A]" />
        </div>
        <h2 className="text-3xl font-black uppercase mb-2">¡Bienvenido!</h2>
        <h3 className="text-xl font-bold mb-2 uppercase">{user.name}</h3>
        <span className={`inline-block text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border-2 border-black mb-8 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
          user.role === 'Administrador' ? 'bg-[#FFD700]' : 
          user.role === 'Cajero' ? 'bg-blue-200' : 'bg-green-200'
        }`}>
          {user.role}
        </span>
        
        <button
          onClick={onClose}
          className="w-full py-4 bg-black text-white hover:bg-slate-800 rounded-xl font-black uppercase text-sm active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
        >
          Continuar <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
