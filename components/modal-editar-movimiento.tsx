'use client';

import { useState, useEffect } from 'react';
import { Edit3, X, ArrowRight, Minus, Plus, Send } from 'lucide-react';

interface Detalle {
    id: number;
    cantidad: number;
    producto: { id: number; codigo: string; nombre: string; tipo: string };
}

interface Movimiento {
    id: number;
    almacenDestino: { id: number; nombre: string };
    transportadoPor: string | null;
    observaciones: string | null;
    detalles: Detalle[];
}

interface Props {
    movimiento: Movimiento | null;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const TIPO_EMOJI: Record<string, string> = {
    canastillo_negro: '⬛',
    canastillo_color: '🎨',
    cooler: '❄️',
    caja: '📦',
};

const TIPO_COLOR: Record<string, string> = {
    canastillo_negro: '#1f2937',
    canastillo_color: '#7c3aed',
    cooler: '#0284c7',
    caja: '#b45309',
};

export default function ModalEditarMovimiento({ movimiento, open, onClose, onSuccess }: Props) {
    const [detalles, setDetalles] = useState<{ productoId: number; cantidad: number }[]>([]);
    const [transportadoPor, setTransportadoPor] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (open && movimiento) {
            setDetalles(movimiento.detalles.map(d => ({ productoId: d.producto.id, cantidad: d.cantidad })));
            setTransportadoPor(movimiento.transportadoPor || '');
            setObservaciones(movimiento.observaciones || '');
            setMessage(null);
        }
    }, [open, movimiento]);

    const setCantidad = (productoId: number, val: number) => {
        if (val < 1) return;
        setDetalles(prev => prev.map(d => d.productoId === productoId ? { ...d, cantidad: val } : d));
    };

    const handleReenviar = async () => {
        if (!movimiento) return;
        setLoading(true); setMessage(null);
        try {
            const res = await fetch(`/api/movimientos/${movimiento.id}/reenviar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ detalles, observaciones, transportadoPor }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al reenviar');
            setMessage({ type: 'success', text: `Movimiento #${movimiento.id} reenviado exitosamente ✓` });
            setTimeout(() => { onClose(); onSuccess(); }, 1200);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Error desconocido' });
        } finally {
            setLoading(false);
        }
    };

    if (!open || !movimiento) return null;

    const getCantidad = (productoId: number) =>
        detalles.find(d => d.productoId === productoId)?.cantidad ?? 1;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div
                className="relative bg-white w-full max-w-lg flex flex-col rounded-2xl shadow-2xl overflow-hidden"
                style={{ maxHeight: 'min(92vh, 660px)' }}
            >
                {/* ── Header naranja/ámbar ── */}
                <div
                    className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                            <Edit3 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white">Editar y Reenviar</h2>
                            <p className="text-xs text-amber-100">
                                Movimiento #{movimiento.id} → {movimiento.almacenDestino.nombre}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* ── Message ── */}
                {message && (
                    <div className={`mx-4 mt-3 p-3 rounded-xl text-sm font-medium flex items-center gap-2 flex-shrink-0 ${message.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* ── Cuerpo ── */}
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

                    {/* Destino (solo lectura) */}
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Destino</p>
                            <p className="text-sm font-semibold text-gray-800">{movimiento.almacenDestino.nombre}</p>
                        </div>
                    </div>

                    {/* Productos — stepper */}
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Productos</p>
                        <div className="space-y-2">
                            {movimiento.detalles.map(d => {
                                const cant = getCantidad(d.producto.id);
                                const color = TIPO_COLOR[d.producto.tipo] || '#374151';
                                return (
                                    <div
                                        key={d.id}
                                        className="flex items-center gap-3 rounded-xl px-4 py-3 border"
                                        style={{ background: color + '08', borderColor: color + '22' }}
                                    >
                                        <span className="text-lg flex-shrink-0">{TIPO_EMOJI[d.producto.tipo] || '📦'}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate" style={{ color }}>
                                                {d.producto.nombre}
                                            </p>
                                            <p className="text-[10px] font-mono text-gray-400">{d.producto.codigo}</p>
                                        </div>

                                        {/* Stepper */}
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setCantidad(d.producto.id, cant - 1)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors border bg-white hover:bg-gray-50"
                                                style={{ borderColor: '#e5e7eb', color: '#6b7280' }}
                                            >
                                                <Minus className="w-3.5 h-3.5" />
                                            </button>
                                            <input
                                                type="number"
                                                min={1}
                                                value={cant}
                                                onChange={e => setCantidad(d.producto.id, parseInt(e.target.value) || 1)}
                                                className="w-12 text-center text-sm font-bold rounded-lg border py-1.5 outline-none focus:ring-2"
                                                style={{ borderColor: color + '44', color }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setCantidad(d.producto.id, cant + 1)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-white"
                                                style={{ background: color }}
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Transportista */}
                    <div>
                        <label className="field-label">
                            Transportado por <span className="text-gray-400 font-normal">(opcional)</span>
                        </label>
                        <input
                            type="text"
                            value={transportadoPor}
                            onChange={e => setTransportadoPor(e.target.value)}
                            placeholder="Nombre del transportista"
                            className="input-field"
                        />
                    </div>

                    {/* Observaciones */}
                    <div>
                        <label className="field-label">
                            Observaciones <span className="text-gray-400 font-normal">(opcional)</span>
                        </label>
                        <textarea
                            value={observaciones}
                            onChange={e => setObservaciones(e.target.value)}
                            rows={2}
                            placeholder="Notas o aclaraciones..."
                            className="input-field resize-none"
                        />
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="px-5 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl font-semibold text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleReenviar}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        {loading ? 'Enviando...' : 'Reenviar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
