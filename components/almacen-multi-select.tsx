'use client';

import { useState, useRef, useEffect } from 'react';
import { Warehouse, Search, ChevronDown, X, Check } from 'lucide-react';

interface Almacen {
  id: number;
  nombre: string;
}

interface Props {
  almacenes: Almacen[];
  selected: number[]; // ids seleccionados, [] = todos
  onChange: (ids: number[]) => void;
  placeholder?: string;
}

export default function AlmacenMultiSelect({ almacenes, selected, onChange, placeholder = 'Todos los almacenes' }: Props) {
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setBusqueda('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtrados = almacenes.filter(a =>
    a.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const toggleAlmacen = (id: number) => {
    if (selected.includes(id)) {
      const next = selected.filter(s => s !== id);
      onChange(next);
    } else {
      onChange([...selected, id]);
    }
  };

  const toggleTodos = () => {
    if (selected.length === 0) {
      // ya están todos → no hacer nada (ya es "todos")
    } else {
      onChange([]); // deseleccionar todos = "todos"
    }
  };

  const label = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      return almacenes.find(a => a.id === selected[0])?.nombre || placeholder;
    }
    return `${selected.length} almacenes`;
  };

  const hasSelection = selected.length > 0;

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`input-field flex items-center gap-2 text-left w-full sm:w-56 ${open ? 'ring-2 ring-blue-500 border-blue-300' : ''}`}
      >
        <Warehouse className="w-4 h-4 flex-shrink-0 text-purple-500" />
        <span className={`flex-1 truncate text-sm ${hasSelection ? 'font-semibold text-purple-700' : 'text-gray-500'}`}>
          {label()}
        </span>
        {hasSelection && (
          <span
            onClick={e => { e.stopPropagation(); onChange([]); }}
            className="flex-shrink-0 w-4 h-4 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-200 transition-colors"
            title="Limpiar"
          >
            <X className="w-2.5 h-2.5" />
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-64 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Buscador */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar almacén..."
                className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Opción "Todos" */}
          {!busqueda && (
            <button
              type="button"
              onClick={toggleTodos}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-gray-50 border-b border-gray-100 ${selected.length === 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected.length === 0 ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}>
                {selected.length === 0 && <Check className="w-3 h-3 text-white" />}
              </span>
              Todos los almacenes
            </button>
          )}

          {/* Lista */}
          <div className="max-h-52 overflow-y-auto">
            {filtrados.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Sin resultados</p>
            ) : (
              filtrados.map(a => {
                const checked = selected.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAlmacen(a.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-purple-50 transition-colors text-left"
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}>
                      {checked && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span className={`truncate ${checked ? 'font-semibold text-purple-800' : 'text-gray-700'}`}>{a.nombre}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer con conteo */}
          {selected.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">{selected.length} de {almacenes.length} seleccionados</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-purple-600 hover:text-purple-800 font-semibold"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
