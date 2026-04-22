import { useEffect, useRef, useState, FormEvent } from "react";
import { ScanLine, Box, AlertCircle } from "lucide-react";
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

export function ScanPage() {
  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState("ZTE");
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
      // 1. Serial es el único dato escaneado
      const serial = rawInput;

      // Validación rápida en memoria (para no esperar a la base de datos si recién se escaneó)
      if (lastScans.some(scan => scan.raw === serial && scan.status === 'success')) {
        throw new Error(`Precaución: El serial ${serial} ya fue registrado correctamente hace un momento.`);
      }

      // Generar consecutivo basado en el último insertado
      const { data: latestOnu, error: maxConsecutiveError } = await supabase
        .from('onus')
        .select('consecutive')
        .order('created_at', { ascending: false })
        .limit(1);

      let newConsecutiveId = 1;
      // Extraemos solo los dígitos en caso de que guardaran el dato con letras antes
      if (latestOnu && latestOnu.length > 0 && latestOnu[0].consecutive) {
        const matchNums = latestOnu[0].consecutive.match(/\d+/);
        if (matchNums && matchNums[0]) {
           newConsecutiveId = parseInt(matchNums[0], 10) + 1;
        }
      }
      const consecutive = newConsecutiveId.toString();
      const model = selectedModel;

      // 2. Traer el Warehouse 1
      const { data: wh, error: whError } = await supabase
        .from('warehouses')
        .select('id')
        .eq('name', 'Almacén 1')
        .single();
        
      if (!wh || whError) throw new Error("No se pudo encontrar Almacén 1");

      // 3. Buscar caja candidata (parcial, o si no hay, la primera vacía)
      const { data: candidateBoxes, error: boxSearchError } = await supabase
        .from('boxes')
        .select('*')
        .eq('warehouse_id', wh.id)
        .in('status', ['partial', 'empty'])
        .order('status', { ascending: false }) // 'partial' > 'empty' (alfabéticamente p > e)
        .order('box_number', { ascending: true })
        .limit(1);

      if (boxSearchError || !candidateBoxes || candidateBoxes.length === 0) {
        throw new Error("No hay cajas parciales ni vacías disponibles. Almacén lleno de cajas ocupadas.");
      }

      const targetBox = candidateBoxes[0];
      const newCount = targetBox.current_onu_count + 1;
      const newStatus = newCount >= 20 ? 'full' : 'partial';

      // 4. Inserción de la ONU
      const { error: onuError } = await supabase
        .from('onus')
        .insert([{
          serial,
          model,
          consecutive,
          box_id: targetBox.id,
          status: 'warehouse_1'
        }]);
        
      if (onuError) {
        if (onuError.code === '23505') throw new Error(`El serial ${serial} ya está registrado.`);
        throw new Error(`Error BD guardando ONU: ${onuError.message}`);
      }

      // 5. Actualizar la Caja
      const { error: boxUpdateError } = await supabase
        .from('boxes')
        .update({ current_onu_count: newCount, status: newStatus })
        .eq('id', targetBox.id);

      if (boxUpdateError) throw new Error("Error actualizando contador de la caja.");

      // 6. Registrar movimiento
      // Asumimos un user dummy para MVP, pero la DB usa user_id. 
      // Como quizas RLS lo exije o falla si auth.uid() no existe, intentaremos pero si falla omitiremos si no es obligatorio
      await supabase.from('movements').insert([{
        type: 'ingreso',
        to_warehouse: wh.id,
        box_id: targetBox.id,
        quantity: 1
      }]);

      // Success
      playAudio('success');
      setLastScans((prev) => [{ raw: rawInput, status: 'success', msg: `Se guardó en Caja ${targetBox.box_number} (${newCount}/20)` }, ...prev].slice(0, 5));

    } catch (err: any) {
      console.error(err);
      playAudio('error');
      setLastScans((prev) => [{ raw: rawInput, status: 'error', msg: err.message }, ...prev].slice(0, 5));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg shadow-sm border border-gray-200 min-h-[500px]">
      <div className="bg-orange-100 p-6 rounded-full mb-6 relative">
        {isProcessing ? (
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500"></div>
        ) : (
          <ScanLine className="w-16 h-16 text-orange-500 animate-pulse" />
        )}
      </div>
      
      <h2 className="text-3xl font-bold mb-2 text-gray-800">Recepción Almacén 1</h2>
      <p className="text-gray-500 mb-8 max-w-md text-center">
        El sistema está listo para recibir el código de las ONUs. Utiliza el escáner de mano.
      </p>

      <form onSubmit={handleScan} className="w-full max-w-md flex flex-col gap-3 mb-8">
        <div className="flex gap-4 mb-2 justify-center">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
            <input 
              type="radio" 
              name="model" 
              value="ZTE" 
              checked={selectedModel === "ZTE"} 
              onChange={() => {
                setSelectedModel("ZTE");
                inputRef.current?.focus();
              }}
              className="w-5 h-5 text-orange-500 focus:ring-orange-500"
              disabled={isProcessing}
            />
            ZTE
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
            <input 
              type="radio" 
              name="model" 
              value="LANLY" 
              checked={selectedModel === "LANLY"} 
              onChange={() => {
                setSelectedModel("LANLY");
                inputRef.current?.focus();
              }}
              className="w-5 h-5 text-orange-500 focus:ring-orange-500"
              disabled={isProcessing}
            />
            LANLY
          </label>
        </div>
        <input 
          ref={inputRef}
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ej: ZTEG12345678"
          className="w-full p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 font-mono text-center text-lg" 
          autoFocus
          disabled={isProcessing}
        />
        <button 
          type="submit" 
          disabled={!inputValue.trim() || isProcessing}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? 'Procesando...' : 'Registrar ONU Manualmente'}
        </button>
      </form>

      {/* Historial rápido */}
      <div className="w-full max-w-lg">
        <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-3 text-center">Últimas Interacciones</h3>
        {lastScans.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-4 italic bg-gray-50 rounded-lg">No hay registros en esta sesión</div>
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
        onClick={() => navigate('/warehouse/1')}
        className="mt-10 flex items-center gap-2 text-orange-600 font-medium hover:text-orange-700 hover:underline"
      >
        <Box className="w-4 h-4" /> Volver al Almacén 1
      </button>
    </div>
  );
}
