'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { generarPDFRecepcion } from '@/lib/utils/pdf';
import { CheckCircle, XCircle, Inbox, X, Package } from 'lucide-react';

interface Movimiento {
    id: number;
    estado: string;
    observaciones: string | null;
    fechaSolicitud: string;
    almacenOrigen: { id: number; nombre: string };
    usuarioSolicitante: { id: number; nombre: string };
    detalles: Array<{
        id: number;
        cantidad: number;
        producto: { id: number; codigo: string; nombre: string; tipo: string };
    }>;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const TIPO_EMOJI: Record<string, string> = {
    canastillo_negro: '⬛',
    canastillo_color: '🎨',
    cooler: '❄️',
    caja: '📦',
};

const TIPO_COLOR: Record<string, { bg: string; color: string }> = {
    canastillo_negro: { bg: '#1f2937', color: '#fff' },
    canastillo_color: { bg: '#7c3aed', color: '#fff' },
    cooler: { bg: '#0284c7', color: '#fff' },
    caja: { bg: '#b45309', color: '#fff' },
};

export default function ModalRecepciones({ open, onClose, onSuccess }: Props) {
    const { data: session } = useSession();
    const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
    const [almacenes, setAlmacenes] = useState<{ id: number; nombre: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState<number | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [modalRechazo, setModalRechazo] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
    const [motivoRechazo, setMotivoRechazo] = useState('');

    const almacenId = (session?.user as any)?.almacenId as number | undefined;

    useEffect(() => {
        if (open && almacenId) {
            setMessage(null);
            fetchData();
        }
    }, [open, almacenId]);

    const fetchData = async () => {
        if (!almacenId) return;
        setLoading(true);
        try {
            const [mRes, aRes] = await Promise.all([
                fetch(`/api/movimientos?almacenDestinoId=${almacenId}`),
                fetch('/api/almacenes'),
            ]);
            if (mRes.ok) setMovimientos(await mRes.json());
            if (aRes.ok) setAlmacenes(await aRes.json());
        } finally { setLoading(false); }
    };

    const handleAprobar = async (id: number) => {
        if (!session?.user?.id) return;
        setProcessing(id); setMessage(null);
        try {
            const res = await fetch(`/api/movimientos/${id}/aprobar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuarioAprobadorId: parseInt(session.user.id) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al aprobar');

            // PDF
            const mov = movimientos.find(m => m.id === id);
            const destino = almacenes.find(a => a.id === almacenId);
            if (mov && destino) {
                generarPDFRecepcion({
                    id: mov.id,
                    fechaSolicitud: mov.fechaSolicitud,
                    fechaAprobacion: new Date().toISOString(),
                    almacenOrigen: mov.almacenOrigen,
                    almacenDestino: { id: destino.id, nombre: destino.nombre },
                    usuarioSolicitante: mov.usuarioSolicitante,
                    usuarioAprobador: { id: parseInt(session.user.id), nombre: session.user.name || 'Usuario' },
                    observaciones: mov.observaciones,
                    detalles: mov.detalles.map(d => ({
                        codigo: d.producto.codigo, nombre: d.producto.nombre,
                        tipo: d.producto.tipo, cantidad: d.cantidad, unidadMedida: 'unidad',
                    })),
                });
            }

            setMessage({ type: 'success', text: `Movimiento #${id} aprobado ✓` });
            setMovimientos(prev => prev.filter(m => m.id !== id));
            onSuccess?.();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Error desconocido' });
        } finally { setProcessing(null); }
    };

    const confirmarRechazo = async () => {
        const id = modalRechazo.id;
        if (!id || !session?.user?.id) return;
        setModalRechazo({ open: false, id: null });
        setProcessing(id); setMessage(null);
        try {
            const res = await fetch(`/api/movimientos/${id}/rechazar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuarioAprobadorId: parseInt(session.user.id), observaciones: motivoRechazo }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al rechazar');
            setMessage({ type: 'success', text: `Movimiento #${id} rechazado` });
            setMovimientos(prev => prev.filter(m => m.id !== id));
            onSuccess?.();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Error desconocido' });
        } finally { setProcessing(null); setMotivoRechazo(''); }
    };

    const totalUds = (m: Movimiento) => m.detalles.reduce((s, d) => s + d.cantidad, 0);
    const formatDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    if (!open) return null;

    return (
        <>
            {/* ── MAIN MODAL ── */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

                <div className="relative bg-white w-full max-w-xl flex flex-col rounded-2xl shadow-2xl overflow-hidden"
                    style={{ maxHeight: 'min(92vh, 680px)' }}>

                    {/* Header verde esmeralda */}
                    <div
                        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                                <Inbox className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white">Recepciones Pendientes</h2>
                                <p className="text-xs text-emerald-100">
                                    {loading ? 'Cargando...' : `${movimientos.length} envío${movimientos.length !== 1 ? 's' : ''} por aprobar`}
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

                    {/* Message banner */}
                    {message && (
                        <div className={`mx-4 mt-4 p-3 rounded-xl text-sm font-medium flex items-center gap-2 flex-shrink-0 ${message.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                            }`}>
                            {message.type === 'success'
                                ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                : <XCircle className="w-4 h-4 flex-shrink-0" />
                            }
                            {message.text}
                        </div>
                    )}

                    {/* Content */}
                    <div className="overflow-y-auto flex-1 px-4 pb-4 pt-3">
                        {loading ? (
                            <div className="flex items-center justify-center py-12 gap-3">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                                <span className="text-sm text-gray-400">Cargando recepciones...</span>
                            </div>
                        ) : !almacenId ? (
                            <div className="py-12 text-center">
                                <Package className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                                <p className="text-sm text-gray-400">Sin almacén asignado</p>
                            </div>
                        ) : movimientos.length === 0 ? (
                            <div className="py-12 text-center">
                                <CheckCircle className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
                                <p className="font-semibold text-gray-700">Todo al día</p>
                                <p className="text-sm text-gray-400 mt-1">No hay recepciones pendientes</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {movimientos.map((mov) => (
                                    <div
                                        key={mov.id}
                                        className="rounded-2xl border bg-white overflow-hidden"
                                        style={{ borderColor: '#E9ECEF', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}
                                    >
                                        {/* Cabecera de la tarjeta */}
                                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span
                                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700"
                                                >
                                                    #{mov.id}
                                                </span>
                                                <span className="text-xs font-semibold text-gray-700 truncate">
                                                    De: {mov.almacenOrigen.nombre}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(mov.fechaSolicitud)}</span>
                                        </div>

                                        {/* Productos */}
                                        <div className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                {mov.detalles.map(d => {
                                                    const tc = TIPO_COLOR[d.producto.tipo] || { bg: '#374151', color: '#fff' };
                                                    return (
                                                        <span
                                                            key={d.id}
                                                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                                                            style={{ background: tc.bg + '18', color: tc.bg }}
                                                        >
                                                            {TIPO_EMOJI[d.producto.tipo] || '📦'}
                                                            {d.producto.nombre}
                                                            <span className="font-bold ml-0.5">× {d.cantidad}</span>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                {mov.usuarioSolicitante.nombre}
                                                {' · '}
                                                <span className="font-semibold text-gray-600">{totalUds(mov)} unidades</span>
                                                {mov.observaciones && (
                                                    <> · <span className="italic text-blue-600">{mov.observaciones}</span></>
                                                )}
                                            </p>
                                        </div>

                                        {/* Botones */}
                                        <div className="px-4 pb-3 flex gap-2">
                                            <button
                                                onClick={() => handleAprobar(mov.id)}
                                                disabled={processing === mov.id}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                                                style={{ background: '#ecfdf5', color: '#065f46' }}
                                            >
                                                {processing === mov.id
                                                    ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                                                    : <CheckCircle className="w-4 h-4" />
                                                }
                                                Aprobar
                                            </button>
                                            <button
                                                onClick={() => { setMotivoRechazo(''); setModalRechazo({ open: true, id: mov.id }); }}
                                                disabled={processing === mov.id}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                                                style={{ background: '#fff1f2', color: '#9f1239', border: '1px solid rgba(244,63,94,0.2)' }}
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Rechazar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>

            {/* ── SUB-MODAL RECHAZO ── */}
            {modalRechazo.open && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setModalRechazo({ open: false, id: null })}
                    />
                    <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
                                <XCircle className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Rechazar Movimiento</h3>
                                <p className="text-xs text-gray-400">#{modalRechazo.id}</p>
                            </div>
                        </div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                            Motivo <span className="font-normal text-gray-400">(opcional)</span>
                        </label>
                        <textarea
                            value={motivoRechazo}
                            onChange={e => setMotivoRechazo(e.target.value)}
                            rows={3}
                            placeholder="Ej: Stock incorrecto, producto equivocado..."
                            className="input-field resize-none mb-4"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setModalRechazo({ open: false, id: null })}
                                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmarRechazo}
                                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-colors"
                                style={{ background: '#e11d48' }}
                            >
                                Confirmar Rechazo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
