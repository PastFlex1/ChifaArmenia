import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Reset search term when opening
  useEffect(() => {
    if (isOpen) setSearchTerm('');
  }, [isOpen]);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-3 bg-[#F7F4F0] border-2 border-black rounded-xl text-sm font-bold focus:outline-none focus:bg-white uppercase transition-colors flex items-center justify-between relative"
      >
        <span className="truncate pr-2">{value}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-[100] overflow-hidden min-w-full flex flex-col">
          {options.length > 5 && (
            <div className="p-2 border-b-2 border-black shrink-0 relative bg-slate-50">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="w-full pl-8 pr-2 py-2 border-2 border-black/20 rounded-lg text-xs font-bold uppercase focus:outline-none focus:border-black transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-xs font-bold uppercase text-center opacity-50">No hay resultados</div>
            ) : (
              filteredOptions.map((opt) => (
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
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
