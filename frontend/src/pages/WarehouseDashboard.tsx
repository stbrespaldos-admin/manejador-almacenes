import { Package, ScanLine, Activity } from "lucide-react";
import { BoxCard } from "../components/BoxCard";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Box, Warehouse } from "../types";

export function WarehouseDashboard({ warehouseId }: { warehouseId: '1' | '2' }) {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [destinationWarehouse, setDestinationWarehouse] = useState<Warehouse | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadWarehouse() {
      setLoading(true);
      
      // Get current user role
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      }

      const name = `Almacén ${warehouseId}`;
      const { data: wh, error: whError } = await supabase
        .from('warehouses')
        .select('*')
        .eq('name', name)
        .single();
      
      if (!wh || whError) {
        console.error("Error cargando almacén:", whError);
        setLoading(false);
        return;
      }
      setWarehouse(wh);

      // ... rest of the logic

      // 2. Traer también el almacén destino para la transferencia
      const destName = warehouseId === '1' ? 'Almacén 2' : 'Almacén 1';
      const { data: dWh } = await supabase.from('warehouses').select('*').eq('name', destName).single();
      if (dWh) setDestinationWarehouse(dWh);

      // 3. Fetch Boxes for this warehouse
      const { data: boxData, error: boxError } = await supabase
        .from('boxes')
        .select('*')
        .eq('warehouse_id', wh.id)
        .order('box_number', { ascending: true });

      if (boxError) {
        console.error("Error cargando cajas:", boxError);
      } else {
        // If no boxes exist, auto-create 20 empty boxes (Initialization)
        if (!boxData || boxData.length === 0) {
          const newBoxesPayload = Array.from({ length: 20 }).map((_, i) => ({
            warehouse_id: wh.id,
            box_number: i + 1,
            status: 'empty',
            current_onu_count: 0
          }));
          
          await supabase.from('boxes').insert(newBoxesPayload);
          
          const { data: newBoxes } = await supabase
            .from('boxes')
            .select('*')
            .eq('warehouse_id', wh.id)
            .order('box_number', { ascending: true });
          
          if (newBoxes) setBoxes(newBoxes as Box[]);
        } else {
          setBoxes(boxData as Box[]);
        }
      }
      setLoading(false);
    }

    loadWarehouse();

    // Setup realtime subscription
    const subscription = supabase
      .channel('boxes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boxes' }, () => {
        // Refresh boxes natively when there are changes
        loadWarehouse();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [warehouseId]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Cargando inventario del Almacén {warehouseId}...</div>;
  }

  const fullBoxes = boxes.filter(b => b.status === 'full').length;
  const partialBoxes = boxes.filter(b => b.status === 'partial').length;
  const spentBoxes = boxes.filter(b => b.status === 'spent').length;
  const totalOnus = boxes.reduce((acc, b) => acc + (b.current_onu_count || 0), 0);

  const handleBoxClick = async (box: Box) => {
    if (warehouseId === '1') {
      if (box.status !== 'full') {
        alert("Solo se pueden transferir cajas completas (Full) al Almacén 2.");
        return;
      }
      
      const confirmTransfer = window.confirm(`¿Confirmas enviar la Caja ${box.box_number} (20 Onus) al Almacén 2?`);
      if (!confirmTransfer || !destinationWarehouse) return;

      const { error: moveError } = await supabase.from('boxes').update({
        warehouse_id: destinationWarehouse.id
      }).eq('id', box.id);

      if (moveError) {
        alert("Error transfiriendo caja: " + moveError.message);
      } else {
        await supabase.from('movements').insert([{
           type: 'transferencia',
           from_warehouse: warehouse?.id,
           to_warehouse: destinationWarehouse.id,
           box_id: box.id,
           quantity: 20
        }]);
        alert("Transferencia exitosa.");
      }
    } else if (warehouseId === '2') {
      alert("Para retirar ONUs de esta caja, dirígete a 'Escanear Salida' y escanea físicamente la ONU.");
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Almacén {warehouseId}</h1>
          <p className="text-slate-500 font-medium">{warehouseId === '1' ? 'Centro de recepción y ensamblado' : 'Logística de despacho y campo'}</p>
        </div>
        <button 
          onClick={() => navigate(warehouseId === '1' ? '/scan' : '/scan-out')} 
          className={`premium-button text-white font-bold py-3 px-8 rounded-2xl flex items-center gap-3 shadow-lg transition-all ${
            warehouseId === '1' ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'
          }`}
        >
          <ScanLine className="w-6 h-6" /> {warehouseId === '1' ? 'Iniciar Ingreso' : 'Registrar Salida'}
        </button>
      </div>

      <div className="bg-slate-900 rounded-[2rem] p-8 text-white flex flex-col md:flex-row justify-between items-center shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-32 -mt-32 transition-transform group-hover:scale-150 duration-1000"></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md border border-white/10">
            <Package className="w-10 h-10 text-orange-400" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Capacidad Total Stock</div>
            <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black tracking-tighter tabular-nums">{totalOnus}</span>
                <span className="text-xl font-bold text-slate-500 uppercase tracking-widest">Equipos</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 mt-6 md:mt-0 relative z-10">
          {totalOnus < (warehouse?.min_stock || 50) && (
            <div className="bg-red-500/20 border border-red-500/50 px-6 py-2 rounded-2xl text-red-400 text-sm font-black uppercase tracking-widest animate-pulse flex items-center gap-2">
              <Activity className="w-4 h-4" /> Alerta: Stock Mínimo
            </div>
          )}
          <div className="bg-white/5 border border-white/10 px-6 py-2 rounded-2xl text-slate-300 text-sm font-bold uppercase tracking-widest">
            {warehouseId === '1' ? 'W1-HUB' : 'W2-OPS'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-[1.5rem] p-6 flex items-center gap-4 border-l-4 border-l-green-500">
          <div className="bg-green-100 p-3 rounded-2xl text-green-600">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-3xl font-black text-slate-800">{fullBoxes}</span>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cajas Listas (Full)</p>
          </div>
        </div>
        <div className="glass-card rounded-[1.5rem] p-6 flex items-center gap-4 border-l-4 border-l-amber-400">
          <div className="bg-amber-100 p-3 rounded-2xl text-amber-600">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-3xl font-black text-slate-800">{partialBoxes}</span>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">En Proceso (Partial)</p>
          </div>
        </div>
        <div className="glass-card rounded-[1.5rem] p-6 flex items-center gap-4 border-l-4 border-l-slate-400">
          <div className="bg-slate-100 p-3 rounded-2xl text-slate-600">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-3xl font-black text-slate-800">{spentBoxes}</span>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Agotadas (Spent)</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Matriz Operativa 5x4</h2>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-12 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500" style={{ width: `${((fullBoxes + partialBoxes) / 20) * 100}%` }}></div>
            </span>
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
              {fullBoxes + partialBoxes} / 20 Slots
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {boxes.map((box) => (
            <div key={box.id} onClick={() => handleBoxClick(box)} className="animate-in zoom-in-95 duration-500">
              <BoxCard box={box} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
