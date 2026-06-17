import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function CustomSelect({ 
  value, 
  onChange, 
  options 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  options: string[]; 
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative w-full">
      {isOpen && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setIsOpen(false)}
        />
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-3 bg-[#F7F4F0] border-2 border-black rounded-xl text-sm font-bold focus:outline-none focus:bg-white uppercase transition-colors flex items-center justify-between z-20 relative"
      >
        <span className="truncate pr-2">{value}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-30 overflow-hidden min-w-full">
          {options.map((opt) => (
            <div
              key={opt}
              onClick={() => {
                 onChange(opt);
                 setIsOpen(false);
              }}
              className={`px-3 py-3 text-sm font-bold uppercase cursor-pointer hover:bg-[#FFD700] hover:text-black transition-colors ${value === opt ? 'bg-[#1A1A1A] text-white hover:text-black hover:bg-[#FFD700]' : ''}`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
