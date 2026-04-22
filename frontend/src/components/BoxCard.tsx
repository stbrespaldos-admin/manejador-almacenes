import type { Box } from "../types";

interface BoxCardProps {
  box: Box;
}

export function BoxCard({ box }: BoxCardProps) {
  const getBoxStyle = () => {
    switch (box.status) {
      case 'full':
        return 'bg-gradient-to-br from-green-400 to-green-600 text-white border-green-300 shadow-lg shadow-green-100';
      case 'partial':
        return 'bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-950 border-amber-200 shadow-lg shadow-amber-100';
      case 'spent':
        return 'bg-gradient-to-br from-slate-300 to-slate-500 text-white border-slate-200 opacity-60';
      case 'empty':
      default:
        return 'bg-white border-slate-200 border-dashed border-2 text-slate-300 hover:border-orange-200 hover:bg-orange-50/30';
    }
  };

  if (box.status === 'empty') {
    return (
      <div className={`h-44 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-300 group ${getBoxStyle()}`}>
        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1">Caja {box.box_number}</span>
        <span className="text-2xl font-light opacity-50 group-hover:scale-125 transition-transform">+</span>
      </div>
    );
  }

  return (
    <div className={`h-44 rounded-2xl border flex flex-col items-center justify-between py-6 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 cursor-pointer relative overflow-hidden group ${getBoxStyle()}`}>
      {/* Decorative pulse for full boxes */}
      {box.status === 'full' && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full animate-ping"></div>
      )}
      
      <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Unit ID: {box.box_number.toString().padStart(2, '0')}</span>
      
      <div className="flex flex-col items-center">
        <div className="relative">
            <span className="text-5xl font-black tracking-tight leading-none drop-shadow-sm">{box.current_onu_count}</span>
            <div className="absolute -right-6 bottom-1 h-2 w-10 bg-black/10 rounded-full blur-[1px]"></div>
        </div>
        <div className="flex items-center gap-1 mt-3">
            <div className="h-1.5 w-12 bg-black/10 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-1000 ease-out ${box.status === 'full' ? 'bg-white' : 'bg-black/30'}`} 
                    style={{ width: `${(box.current_onu_count / 20) * 100}%` }}
                ></div>
            </div>
            <span className="text-[11px] font-bold opacity-60">20</span>
        </div>
      </div>
      
      <div className="mt-4 px-3 py-1 bg-black/5 rounded-full">
        <span className="text-[10px] font-black uppercase tracking-widest">
            {box.status}
        </span>
      </div>
    </div>
  );
}
