import { Outlet, NavLink } from "react-router-dom";
import { Package, ScanLine, History, LogOut, Activity, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function Layout() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function getProfile(userId: string) {
      const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
      if (data) setRole(data.role);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
      if (session?.user) getProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
      if (session?.user) getProfile(session.user.id);
      else setRole(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="STB Warehouse Box Manager" className="h-12 w-auto object-contain drop-shadow-md" />
          </div>

          <nav className="flex items-center space-x-6 text-sm font-medium ml-10">
            <NavLink
              to="/warehouse/1"
              className={({ isActive }) =>
                `flex items-center gap-2 pb-1 border-b-2 ${
                  isActive ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`
              }
            >
              <Package className="w-4 h-4" /> Almacén 1
            </NavLink>
            <NavLink
              to="/warehouse/2"
              className={({ isActive }) =>
                `flex items-center gap-2 pb-1 border-b-2 ${
                  isActive ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`
              }
            >
              <Package className="w-4 h-4" /> Almacén 2
            </NavLink>
            <NavLink
              to="/scan"
              className={({ isActive }) =>
                `flex items-center gap-2 pb-1 border-b-2 ${
                  isActive ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`
              }
            >
              <ScanLine className="w-4 h-4" /> Escanear
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `flex items-center gap-2 pb-1 border-b-2 ${
                  isActive ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`
              }
            >
              <History className="w-4 h-4" /> Equipos
            </NavLink>
            {(role === 'admin' || role === 'supervisor') && (
              <NavLink
                to="/audit"
                className={({ isActive }) =>
                  `flex items-center gap-2 pb-1 border-b-2 ${
                    isActive ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`
                }
              >
                <Activity className="w-4 h-4" /> Auditoría
              </NavLink>
            )}
            {role === 'admin' && (
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center gap-2 pb-1 border-b-2 ${
                    isActive ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`
                }
              >
                <Settings className="w-4 h-4" /> Configuración
              </NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          {userEmail && (
            <div className="flex flex-col items-end">
              <span className="hidden sm:block truncate max-w-[180px] font-medium" title={userEmail}>
                {userEmail}
              </span>
              {role && (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-500">
                  {role}
                </span>
              )}
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 hover:text-red-600 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
