import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export function HistoryPage() {
  const [onus, setOnus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      // Fetch onus left join with their boxes and warehouses
      const { data, error } = await supabase
        .from('onus')
        .select(`
          id,
          consecutive,
          model,
          serial,
          created_at,
          boxes (
            box_number,
            status,
            warehouses (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching ONUs:', error);
      } else if (data) {
        setOnus(data);
      }
      setLoading(false);
    }
    loadHistory();
  }, []);

  const exportToExcel = () => {
    if (onus.length === 0) return;

    // Transform data for Excel
    const dataForExcel = onus.map((onu) => ({
      'ID de Escaneo': onu.id.slice(0, 8),
      'Consecutivo': onu.consecutive,
      'Modelo': onu.model,
      'Serial/MAC': onu.serial,
      'Fecha de Escaneo': new Date(onu.created_at).toLocaleString(),
      'Caja Asignada': onu.boxes?.box_number || 'N/A',
      'Estado Caja': onu.boxes?.status || 'N/A',
      'Ubicación Actual': onu.boxes?.warehouses?.name || 'N/A',
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial ONUs');

    // Download file
    XLSX.writeFile(workbook, `STB_Historial_ONUs_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Cargando historial...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Historial de Equipos</h1>
          <p className="text-gray-500">Registro completo de las ONUs despachadas y en stock</p>
        </div>
        <button
          onClick={exportToExcel}
          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-md flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
        >
          <Download className="w-5 h-5" /> Exportar a Excel
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha / Hora</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consecutivo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modelo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación Actual</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {onus.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                  Aún no hay ONUs escaneadas en el sistema.
                </td>
              </tr>
            ) : (
              onus.map((onu) => (
                <tr key={onu.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(onu.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {onu.consecutive}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                      {onu.model}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {onu.serial}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {onu.boxes?.warehouses?.name || 'Desconocido'} - Caja {onu.boxes?.box_number} ({onu.boxes?.status})
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
