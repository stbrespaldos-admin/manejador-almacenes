import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Box, AlertCircle, Unplug } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

// Función utilitaria para generar pitidos del lector sin necesidad de archivos de audio
const playAudio = (type: 'success' | 'error') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(250, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start();
      // El error suena un poco más largo y grave para que llame la atención de inmediato
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch(e) {
    console.error("Audio error", e);
  }
};

export function ScanOutPage() {
  const [inputValue, setInputValue] = useState("");
  const [lastScans, setLastScans] = useState<{ raw: string; status: 'success' | 'error'; msg: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus the input automatically so physical scanner works without clicking
  useEffect(() => {
    inputRef.current?.focus();
    const handleGlobalClick = () => inputRef.current?.focus();
    // Keep focus to catch scanner inputs 
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleScan = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    setIsProcessing(true);
    const rawInput = inputValue.trim();
    setInputValue(""); // clear immediately

    try {
      // 1. Extraer el serial (asumiendo formato "Consecutivo Modelo Serial" o solo "Serial")
      const parts = rawInput.split(/\s+/);
      const serial = parts.length >= 3 ? parts.slice(2).join(' ') : rawInput;

      // Validación rápida en memoria (para no fallar silenciosamente o hacer fetch de BD)
      if (lastScans.some(scan => scan.raw === rawInput && scan.status === 'success')) {
        throw new Error(`Precaución: El código ${rawInput} ya lo despachaste correctamente hace un momento.`);
      }

      // 2. Buscar la ONU específica y la información de la caja en la BD
      const { data: onu, error: onuSearchError } = await supabase
        .from('onus')
        .select(`
          id, 
          status, 
          box_id, 
          boxes (
            id,
            warehouse_id, 
            box_number, 
            current_onu_count, 
            warehouses (name)
          )
        `)
        .eq('serial', serial)
        .single();
        
      if (onuSearchError || !onu) {
        throw new Error(`ONU con serial "${serial}" no encontrada en el sistema.`);
      }

      // 3. Validaciones
      const box = onu.boxes as any;
      if (!box || box.warehouses.name !== 'Almacén 2') {
        throw new Error(`Esta ONU no se encuentra en el Almacén 2. Ubicación registrada: ${box?.warehouses?.name || 'Desconocido'}.`);
      }

      if (onu.status === 'field' || onu.status === 'spent') {
        throw new Error(`Esta ONU ya fue despachada o consumida anteriormente.`);
      }

      // 4. Actualizar el estado de la ONU a consumida
      const { error: updateOnuError } = await supabase
        .from('onus')
        .update({ status: 'field' })
        .eq('id', onu.id);

      if (updateOnuError) throw new Error("Error actualizando el estado de la ONU.");

      // 5. Actualizar la Caja restando 1 unidad
      const newCount = box.current_onu_count - 1;
      const newStatus = newCount <= 0 ? 'spent' : 'partial';

      const { error: boxUpdateError } = await supabase
        .from('boxes')
        .update({ current_onu_count: newCount, status: newStatus })
        .eq('id', box.id);

      if (boxUpdateError) throw new Error("Error actualizando contador de la caja.");

      // 6. Registrar movimiento de consumo
      await supabase.from('movements').insert([{
        type: 'consumo',
        from_warehouse: box.warehouse_id,
        box_id: box.id,
        quantity: 1
      }]);

      // Success
      playAudio('success');
      setLastScans((prev) => [{ raw: rawInput, status: 'success' as const, msg: `Se extrajo de la Caja ${box.box_number}. (Quedan ${newCount} ONUs)` }, ...prev].slice(0, 5));

    } catch (err: any) {
      console.error(err);
      playAudio('error');
      setLastScans((prev) => [{ raw: rawInput, status: 'error' as const, msg: err.message }, ...prev].slice(0, 5));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg shadow-sm border border-gray-200 min-h-[500px]">
      <div className="bg-red-100 p-6 rounded-full mb-6 relative">
        {isProcessing ? (
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600"></div>
        ) : (
          <Unplug className="w-16 h-16 text-red-600 animate-pulse" />
        )}
      </div>
      
      <h2 className="text-3xl font-bold mb-2 text-gray-800">Consumo Almacén 2</h2>
      <p className="text-gray-500 mb-8 max-w-md text-center">
        Escanea la ONU que vas a despachar. El sistema la registrará como consumida y restará la unidad de su caja correspondiente.
      </p>

      <form onSubmit={handleScan} className="w-full max-w-md flex flex-col gap-3 mb-8">
        <input 
          ref={inputRef}
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Escanea el código de la ONU..."
          className="w-full p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-600 font-mono text-center text-lg" 
          autoFocus
          disabled={isProcessing}
        />
        <button 
          type="submit" 
          disabled={!inputValue.trim() || isProcessing}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? 'Procesando...' : 'Despachar ONU Manualmente'}
        </button>
      </form>

      {/* Historial rápido */}
      <div className="w-full max-w-lg">
        <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-3 text-center">Últimas Salidas</h3>
        {lastScans.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-4 italic bg-gray-50 rounded-lg">No hay consumos en esta sesión</div>
        ) : (
          <ul className="space-y-3">
            {lastScans.map((scan, i) => (
              <li key={i} className={`flex flex-col p-3 rounded-lg border ${scan.status === 'success' ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-sm font-semibold text-gray-700">{scan.raw}</span>
                  {scan.status === 'success' ? (
                    <span className="text-[10px] text-green-700 font-bold px-2 py-0.5 bg-green-200 rounded uppercase tracking-wider">OK</span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-red-700 font-bold px-2 py-0.5 bg-red-200 rounded uppercase tracking-wider">
                      <AlertCircle className="w-3 h-3" /> Error
                    </span>
                  )}
                </div>
                <span className={`text-xs ${scan.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {scan.msg}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button 
        onClick={() => navigate('/warehouse/2')}
        className="mt-10 flex items-center gap-2 text-red-600 font-medium hover:text-red-700 hover:underline"
      >
        <Box className="w-4 h-4" /> Volver al Almacén 2
      </button>
    </div>
  );
}
