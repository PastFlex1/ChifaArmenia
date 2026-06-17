import React from 'react';
import { ChefHat, Loader2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#B91C1C] flex flex-col items-center justify-center z-[200]">
      <div className="w-24 h-24 bg-[#FFD700] rounded-full border-4 border-black flex items-center justify-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-bounce mb-8">
        <ChefHat className="w-12 h-12 text-[#1A1A1A]" />
      </div>
      <h1 className="text-4xl font-black italic uppercase text-white tracking-widest text-center px-4">
        Chifa Mei Hua
      </h1>
      <p className="text-[#FFD700] font-black tracking-widest mt-2 px-4 text-center">CARGANDO RECURSOS...</p>
      <Loader2 className="w-8 h-8 text-white animate-spin mt-8" />
    </div>
  );
}
