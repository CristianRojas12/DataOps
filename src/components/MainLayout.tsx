import { useState } from "react";
import { MainCalendarView } from "./MainCalendarView";
import { SummaryView } from "./SummaryView";
import { AssignGuardModal } from "./AssignGuardModal";
import { CriticalProductsView } from "./CriticalProductsView";
import { CriticalProductsControls } from "./CriticalProductsControls";
import { RequestTimeOffModal } from "./RequestTimeOffModal";
import { RequestsView } from "./RequestsView";
import { CalendarDays, LayoutDashboard, Settings, LogOut, Package, Plane } from "lucide-react";

import { useGuardContext } from "../context";
import { useUiStore } from "../store";
import { CriticalProductsProvider } from "../productsContext";

export function MainLayout() {
  const [activeTab, setActiveTab] = useState<"resumen" | "calendario" | "productos" | "solicitudes">("resumen");
  const { session, logout } = useGuardContext();
  const { setTimeOffModalOpen } = useUiStore();

  return (
    <div className="flex h-screen bg-[#0f111a] text-white overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <div className="w-16 md:w-64 border-r border-border bg-[#13151f] flex flex-col shrink-0">
         <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-border shrink-0">
            <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center font-bold text-lg shrink-0">
               D
            </div>
            <span className="ml-3 font-semibold text-lg hidden md:block">DataOps</span>
         </div>

         <div className="flex-1 py-6 flex flex-col gap-2 px-3">
            <button
               onClick={() => setActiveTab("resumen")}
               className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${activeTab === 'resumen' ? 'bg-indigo-500/10 text-indigo-400' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
            >
               <LayoutDashboard className="w-5 h-5 shrink-0" />
               <span className="font-medium hidden md:block">Resumen</span>
            </button>
            <button
               onClick={() => setActiveTab("calendario")}
               className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${activeTab === 'calendario' ? 'bg-indigo-500/10 text-indigo-400' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
            >
               <CalendarDays className="w-5 h-5 shrink-0" />
               <span className="font-medium hidden md:block">Calendario</span>
            </button>
            <button
               onClick={() => setActiveTab("productos")}
               className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${activeTab === 'productos' ? 'bg-indigo-500/10 text-indigo-400' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
            >
               <Package className="w-5 h-5 shrink-0" />
               <span className="font-medium hidden md:block">Productos Críticos</span>
            </button>
            <button
               onClick={() => setActiveTab("solicitudes")}
               className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${activeTab === 'solicitudes' ? 'bg-indigo-500/10 text-indigo-400' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
            >
               <Plane className="w-5 h-5 shrink-0" />
               <span className="font-medium hidden md:block">Solicitudes</span>
            </button>
         </div>

         <div className="p-4 border-t border-border mt-auto">
            <div className="flex items-center gap-3 mb-4 px-2">
               <div className="w-8 h-8 rounded-full bg-indigo-900 flex items-center justify-center shrink-0 border border-indigo-500/30">
                 <Settings className="w-4 h-4 text-indigo-300" />
               </div>
               <div className="hidden md:flex flex-col overflow-hidden">
                 <span className="text-sm font-medium truncate">{session?.user?.email}</span>
                 <span className="text-xs text-muted-foreground capitalize">{session?.role}</span>
               </div>
            </div>
            <button
              onClick={() => logout()}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-red-400 hover:text-red-300 hover:bg-red-400/10 w-full"
            >
               <LogOut className="w-5 h-5 shrink-0" />
               <span className="font-medium hidden md:block">Cerrar Sesión</span>
            </button>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
         {/* Top Header - Strict UI Rule: Standardized central area for Action buttons */}
         <div className="h-16 flex items-center justify-end px-6 border-b border-border shrink-0 bg-[#13151f] gap-4">
            {activeTab === "resumen" && (
              <button
                 onClick={() => setTimeOffModalOpen(true)}
                 className="bg-green-600 hover:bg-green-700 text-white h-9 px-4 w-auto min-w-[140px] rounded-md text-sm font-medium transition-colors flex items-center justify-center"
              >
                 + Crear Solicitud
              </button>
            )}
            {activeTab !== "productos" && session?.role === 'admin' && (
              <AssignGuardModal />
            )}
            {activeTab === "productos" && (
              <CriticalProductsControls />
            )}
         </div>
         <RequestTimeOffModal />

         <div className="flex-1 overflow-hidden relative">
            {activeTab === "resumen" && <SummaryView />}
            {activeTab === "calendario" && <MainCalendarView />}
            {activeTab === "solicitudes" && <RequestsView />}
            {activeTab === "productos" && (
               <CriticalProductsProvider>
                  <CriticalProductsView />
               </CriticalProductsProvider>
            )}
         </div>
      </div>
    </div>
  );
}
