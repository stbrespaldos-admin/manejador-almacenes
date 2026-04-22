import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Download, ArrowRight, History, Activity } from 'lucide-react';
import * as XLSX from 'xlsx';

export function MovementsPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMovements() {
      setLoading(true);
      const { data, error } = await supabase
        .from('movements')
        .select(`
          id,
          type,
          quantity,
          created_at,
          box_id,
          from_wh:from_warehouse (name),
          to_wh:to_warehouse (name),
          boxes (box_number)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching movements:', error);
      } else if (data) {
        setMovements(data);
      }
      setLoading(false);
    }
    loadMovements();
  }, []);

  const exportToExcel = () => {
    if (movements.length === 0) return;

    const dataForExcel = movements.map((m) => ({
      'ID Movimiento': m.id.slice(0, 8),
      'Fecha': new Date(m.created_at).toLocaleString(),
      'Tipo': m.type.toUpperCase(),
      'Cantidad': m.quantity,
      'Caja': m.boxes?.box_number || 'N/A',
      'Desde': m.from_wh?.name || 'N/A',
      'Hacia': m.to_wh?.name || 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Auditoría Movimientos');
    XLSX.writeFile(workbook, `Auditoria_Movimientos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getStatusStyle = (type: string) => {
    switch (type) {
      case 'ingreso': return 'bg-green-100 text-green-800 border-green-200';
      case 'transferencia': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'consumo': return 'bg-red-100 text-red-800 border-red-200';
      case 'ajuste': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500 animate-pulse flex flex-col items-center gap-4">
      <Activity className="w-10 h-10 animate-spin text-orange-400" />
      <span>Consultando registros de auditoría...</span>
    </div>;
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="bg-orange-500 p-3 rounded-xl shadow-lg shadow-orange-200">
            <History className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Auditoría de Movimientos</h1>
            <p className="text-gray-500 text-sm">Registro histórico de todas las operaciones realizadas</p>
          </div>
        </div>
        <button
          onClick={exportToExcel}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-md shadow-green-100 transition-all hover:scale-105 active:scale-95"
        >
          <Download className="w-5 h-5" /> Exportar a Excel
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-100/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Fecha y Hora</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Operación</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Cantidad</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Origen / Destino</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Caja</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Activity className="w-12 h-12 opacity-20" />
                      <p className="font-medium italic">No se han registrado movimientos todavía.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {new Date(m.created_at).toLocaleString('es-ES', { 
                        day: '2-digit', month: '2-digit', year: 'numeric', 
                        hour: '2-digit', minute: '2-digit' 
                      })}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getStatusStyle(m.type)}`}>
                        {m.type}
                      </span>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-bold text-gray-700">{m.quantity}</span>
                        <span className="text-xs text-gray-400 font-medium uppercase">ONUs</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          {m.from_wh?.name || '---'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                        <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          {m.to_wh?.name || '---'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      {m.boxes ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                          <span className="text-sm font-bold text-gray-700">Caja {m.boxes.box_number}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300 italic text-xs">Sin caja</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
