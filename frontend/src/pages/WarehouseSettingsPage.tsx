import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Settings, Save, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

export function WarehouseSettingsPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching warehouses:', error);
      } else if (data) {
        setWarehouses(data);
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  const handleUpdateMinStock = async (id: string, newMin: number) => {
    setSaving(id);
    const { error } = await supabase
      .from('warehouses')
      .update({ min_stock: newMin })
      .eq('id', id);

    if (error) {
      alert("Error actualizando: " + error.message);
    } else {
      setWarehouses(prev => prev.map(w => w.id === id ? { ...w, min_stock: newMin } : w));
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 animate-pulse flex flex-col items-center gap-4">
        <RefreshCw className="w-10 h-10 animate-spin text-orange-400" />
        <span>Cargando configuraciones globales...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
        <div className="flex items-center gap-5">
          <div className="bg-slate-900 p-4 rounded-2xl shadow-xl">
            <Settings className="w-8 h-8 text-orange-400 animate-[spin_4s_linear_infinite]" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight italic">Panel de Configuración</h1>
            <div className="flex items-center gap-2 mt-1">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Acceso Nivel Administrativo</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {warehouses.map((wh) => (
          <div key={wh.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-2 h-full bg-orange-500"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex-1">
                <h3 className="text-2xl font-black text-slate-800 mb-2">{wh.name}</h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-md">
                  Ajusta los parámetros operativos para este almacén. Los cambios se aplicarán en tiempo real para todos los operarios.
                </p>
              </div>

              <div className="flex flex-col gap-4 min-w-[280px]">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Alerta Stock Mínimo</span>
                    <AlertTriangle className={`w-4 h-4 ${wh.min_stock < 20 ? 'text-red-500' : 'text-amber-500'}`} />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <input 
                      type="number" 
                      defaultValue={wh.min_stock}
                      onBlur={(e) => handleUpdateMinStock(wh.id, parseInt(e.target.value))}
                      disabled={saving === wh.id}
                      className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-2xl font-black text-slate-700 focus:outline-none focus:border-orange-500 transition-colors disabled:opacity-50"
                    />
                    <div className="bg-white border-2 border-slate-200 p-3 rounded-xl">
                        <Save className={`w-6 h-6 ${saving === wh.id ? 'animate-bounce text-orange-500' : 'text-slate-300'}`} />
                    </div>
                  </div>
                  <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    {saving === wh.id ? 'Guardando cambios...' : 'Presiona fuera para guardar'}
                  </p>
                </div>
              </div>
            </div>

            {/* Visual preview of the alert status */}
            <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="text-sm font-bold text-slate-600">Umbral configurado a {wh.min_stock} unidades</span>
                </div>
                <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                    ID: {wh.id.slice(0,8)}
                </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border-2 border-amber-100 p-6 rounded-2xl flex gap-4 items-start">
        <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
        <div>
            <h4 className="font-black text-amber-900 uppercase text-xs tracking-widest mb-1">Nota de Seguridad</h4>
            <p className="text-sm text-amber-800 leading-relaxed">
                Los cambios realizados aquí afectan la lógica de alertas en los Dashboards de todos los usuarios. 
                Asegúrate de que los valores de stock mínimo reflejen la capacidad real de reposición de la sucursal.
            </p>
        </div>
      </div>
    </div>
  );
}
