import { useState, useEffect } from "react";
import { MainCalendarView } from "./MainCalendarView";
import { SummaryView } from "./SummaryView";
import { AssignGuardModal } from "./AssignGuardModal";
import { CriticalProductsView } from "./CriticalProductsView";
import { CriticalProductsControls } from "./CriticalProductsControls";
import { RequestTimeOffModal } from "./RequestTimeOffModal";
import { RequestsView } from "./RequestsView";
import { CalendarDays, LayoutDashboard, Settings, LogOut, Package, Plane, Sun, Moon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

import { useGuardContext } from "../context";
import { useUiStore } from "../store";
import { CriticalProductsProvider } from "../productsContext";

export function MainLayout() {
  const [activeTab, setActiveTab] = useState<"resumen" | "calendario" | "productos" | "solicitudes">(
    () => (localStorage.getItem("dataops_active_tab") as any) || "resumen"
  );
  const { session, logout } = useGuardContext();
  const { setTimeOffModalOpen, setTheme } = useUiStore();

  useEffect(() => {
    localStorage.setItem("dataops_active_tab", activeTab);
  }, [activeTab]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0f111a] text-gray-900 dark:text-gray-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <div className="w-16 md:w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#13151f] flex flex-col shrink-0">
         <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <div className="w-8 h-8 rounded bg-amber-400 flex items-center justify-center font-bold text-lg shrink-0">
               D
            </div>
            <span className="ml-3 font-semibold text-lg hidden md:block">DataOps</span>
         </div>

         <div className="flex-1 py-6 flex flex-col gap-2 px-3">
            <button
               onClick={() => setActiveTab("resumen")}
               className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${activeTab === 'resumen' ? 'bg-indigo-500/10 text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/5 dark:hover:bg-[#1f2233]'}`}
            >
               <LayoutDashboard className="w-5 h-5 shrink-0" />
               <span className="font-medium hidden md:block">Resumen</span>
            </button>
            <button
               onClick={() => setActiveTab("calendario")}
               className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${activeTab === 'calendario' ? 'bg-indigo-500/10 text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/5 dark:hover:bg-[#1f2233]'}`}
            >
               <CalendarDays className="w-5 h-5 shrink-0" />
               <span className="font-medium hidden md:block">Calendario</span>
            </button>
            <button
               onClick={() => setActiveTab("productos")}
               className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${activeTab === 'productos' ? 'bg-indigo-500/10 text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/5 dark:hover:bg-[#1f2233]'}`}
            >
               <Package className="w-5 h-5 shrink-0" />
               <span className="font-medium hidden md:block">Productos Críticos</span>
            </button>
            <button
               onClick={() => setActiveTab("solicitudes")}
               className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${activeTab === 'solicitudes' ? 'bg-indigo-500/10 text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/5 dark:hover:bg-[#1f2233]'}`}
            >
               <Plane className="w-5 h-5 shrink-0" />
               <span className="font-medium hidden md:block">Solicitudes</span>
            </button>
         </div>

         <div className="p-4 border-t border-gray-200 dark:border-gray-800 mt-auto">
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center gap-3 mb-4 px-2 text-left rounded-md hover:bg-gray-100 dark:hover:bg-[#1f2233] transition-colors p-1 cursor-pointer">
                   <div className="w-8 h-8 rounded-full bg-indigo-900 flex items-center justify-center shrink-0 border border-indigo-500/30">
                     <Settings className="w-4 h-4 text-indigo-300" />
                   </div>
                   <div className="hidden md:flex flex-col overflow-hidden">
                     <span className="text-sm font-medium truncate">{session?.user?.email}</span>
                     <span className="text-xs text-gray-500 capitalize">{session?.role}</span>
                   </div>
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-48 p-1 bg-white dark:bg-[#1a1c29] border-gray-200 dark:border-gray-800">
                <div className="flex flex-col gap-1">
                  <button onClick={() => setTheme("light")} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#1f2233] rounded-sm transition-colors text-left w-full">
                    <Sun className="w-4 h-4" /> Modo Claro
                  </button>
                  <button onClick={() => setTheme("dark")} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#1f2233] rounded-sm transition-colors text-left w-full">
                    <Moon className="w-4 h-4" /> Modo Oscuro
                  </button>
                </div>
              </PopoverContent>
            </Popover>
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
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-[#0f111a]">
        <div className="max-w-[1600px] mx-auto w-full flex flex-col h-full bg-white dark:bg-[#13151f] shadow-sm border-x border-gray-200 dark:border-gray-800">
         {/* Top Header - Strict UI Rule: Standardized central area for Action buttons */}
         <div className="h-16 flex items-center justify-end px-6 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-white dark:bg-[#1a1c29] gap-4">
            {activeTab === "resumen" && (
              <button
                 onClick={() => setTimeOffModalOpen(true)}
                 className="bg-amber-400 hover:bg-amber-500 text-gray-900 h-9 px-4 w-auto min-w-[140px] rounded-md text-sm font-medium transition-colors flex items-center justify-center"
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

         <div className="flex-1 overflow-hidden relative bg-gray-50 dark:bg-[#0f111a]">
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
    </div>
  );
}
