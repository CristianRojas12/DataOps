import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Search, Trash2 } from "lucide-react";
import { useGuardContext } from "../context";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { LoadingSpinner } from "./LoadingSpinner";


export function MainCalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { members, guards, timeOffRequests, calendarDim, removeGuard, deleteTimeOffRequest, isLoading, session } = useGuardContext();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Set standard grid
  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start, end });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const getDayDim = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    return calendarDim.find(r => r.date_key === key);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0f111a] text-gray-900 dark:text-gray-100 p-6 overflow-hidden">
      {/* Calendar Header Tools */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white dark:bg-[#1a1c29] rounded-md border border-gray-200 dark:border-gray-800 p-1">
            <button onClick={prevMonth} className="p-1.5 hover:bg-white/5 rounded-md transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="min-w-[120px] text-center font-medium capitalize text-sm">
              {format(currentDate, "MMMM yyyy", { locale: es })}
            </span>
            <button onClick={nextMonth} className="p-1.5 hover:bg-white/5 rounded-md transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button
             onClick={() => setCurrentDate(new Date())}
             className="text-sm px-3 py-1.5 bg-white dark:bg-[#13151f] border border-gray-200 dark:border-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-[#1f2233] transition-colors flex items-center gap-2"
          >
            Mes Actual
          </button>
        </div>

        <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
              <input
                 type="text"
                 placeholder="Buscar miembro..."
                 className="pl-9 pr-4 py-1.5 bg-white dark:bg-[#13151f] border border-gray-200 dark:border-gray-800 rounded-md text-sm w-64 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-3 text-xs flex-wrap justify-end max-w-sm">
               <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#F97316" }}></span>
                  <span className="text-gray-500 dark:text-gray-400">Matutina</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#A855F7" }}></span>
                  <span className="text-gray-500 dark:text-gray-400">Vespertina</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#d1fae5] dark:bg-[#10b981]"></span>
                  <span className="text-gray-500 dark:text-gray-400">Vacaciones</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-slate-500 dark:bg-[#6C6E7D]"></span>
                  <span className="text-gray-500 dark:text-gray-400">Día Libre</span>
               </div>
            </div>
        </div>
      </div>

      {/* Main Grid Area - Horizontal Scroll */}
      <div className="flex-1 overflow-x-auto overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#1a1c29] relative">
         <div className="w-max min-w-full">
            {/* Header Row (Days) */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-[#1a1c29] z-40">
               {/* Fixed Member Column Header */}
               <div className="w-48 shrink-0 border-r border-gray-200 dark:border-gray-800 p-3 sticky left-0 z-50 bg-white dark:bg-[#1a1c29]">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Miembros ({members.length})</span>
               </div>

               {/* Days Headers */}
               {monthDays.map((day, i) => {
                  const dim = getDayDim(day);
                  const isHol = dim?.is_holiday ?? false;
                  return (
                  <div key={`header-${i}`} className={`w-12 shrink-0 flex flex-col items-center justify-center py-2 border-r border-gray-200 dark:border-gray-800 relative ${isHol ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-200' : 'bg-white dark:bg-[#1a1c29]'}`} title={isHol ? dim?.holiday_name || "Feriado" : ""}>
                     {isHol && <span className="absolute top-1 right-1 w-1 h-1 bg-amber-500 rounded-full"></span>}
                     <span className={`text-[10px] uppercase ${isHol ? 'text-amber-200' : 'text-gray-500 dark:text-gray-400'}`}>{format(day, "EEEEEE", { locale: es })}</span>
                     <span className={`text-sm font-medium ${isHol ? 'text-amber-400' : ''}`}>{format(day, "d")}</span>
                  </div>
               )})}
            </div>

            {/* Members Rows */}
            <div className="flex flex-col relative z-0">
               {members.map(member => (
                  <div key={member.id} className="flex border-b border-gray-200/50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                     {/* Sticky Member Name */}
                     <div className="w-48 shrink-0 border-r border-gray-200 dark:border-gray-800 p-3 flex items-center sticky left-0 z-30 bg-white dark:bg-[#1a1c29] group-hover:bg-gray-50 dark:group-hover:bg-[#1a1c29] transition-colors">
                        <div className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-medium mr-3">
                           {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{member.name}</span>
                     </div>

                     {/* Days Cells */}
                     {monthDays.map((day, i) => {
                        const guard = guards.find(g =>
                           g.memberId === member.id &&
                           isWithinInterval(day, { start: g.startDate, end: g.endDate })
                        );

                        const timeOff = timeOffRequests.find(r =>
                           r.memberId === member.id &&
                           r.status === 'approved' &&
                           isWithinInterval(day, { start: r.startDate, end: r.endDate })
                        );

                        return (
                           <div key={`cell-${i}`} className="w-12 shrink-0 border-r border-gray-200/50 dark:border-gray-800/50 p-1 flex items-center justify-center relative">
                              {timeOff && (
                                 <Popover>
                                    <PopoverTrigger asChild>
                                       <div

                                          className={`absolute inset-y-1.5 inset-x-0.5 rounded opacity-90 z-20 cursor-pointer hover:opacity-100 transition-opacity ${timeOff.type === "vacaciones" ? "bg-[#d1fae5] dark:bg-[#10b981]" : "bg-slate-500 text-white dark:bg-[#6C6E7D]"}`}
                                          title={`${timeOff.type === 'vacaciones' ? 'Vacaciones' : 'Día Libre'}`}
                                       />
                                    </PopoverTrigger>
                                    {session?.role === 'admin' && (
                                      <PopoverContent className="w-48 p-2 bg-white dark:bg-[#1a1c29] border-gray-200 dark:border-gray-800 z-50 dark:text-gray-100">
                                         <div className="flex flex-col gap-2 text-sm">
                                            <div className="font-medium">{timeOff.type === 'vacaciones' ? 'Vacaciones' : 'Día Libre'}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                               {format(timeOff.startDate, "dd MMM")} - {format(timeOff.endDate, "dd MMM")}
                                            </div>
                                            <button
                                               onClick={() => {
                                                  if(window.confirm("¿Eliminar solicitud aprobada?")) {
                                                     deleteTimeOffRequest(timeOff.id);
                                                  }
                                               }}
                                               className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 rounded transition-colors w-full text-left"
                                            >
                                               <Trash2 className="w-4 h-4" /> Eliminar Solicitud
                                            </button>
                                         </div>
                                      </PopoverContent>
                                    )}
                                 </Popover>
                              )}
                              {guard && (
                                 <Popover>
                                    <PopoverTrigger asChild>
                                       <div
                                          className={`absolute inset-y-1.5 inset-x-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity z-10 ${timeOff ? 'h-1/2 top-auto' : ''}`}
                                          style={{ backgroundColor: guard.type === 'Guardia Matutina' ? '#F97316' : '#A855F7' }}
                                          title={`${guard.type}`}
                                       />
                                    </PopoverTrigger>
                                    {session?.role === 'admin' && (
                                      <PopoverContent className="w-48 p-2 bg-white dark:bg-[#1a1c29] border-gray-200 dark:border-gray-800 z-50 dark:text-gray-100">
                                         <div className="flex flex-col gap-2 text-sm">
                                            <div className="font-medium">{guard.type}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                               {format(guard.startDate, "dd MMM")} - {format(guard.endDate, "dd MMM")}
                                            </div>
                                            <button
                                               onClick={() => removeGuard(guard.id)}
                                               className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 rounded transition-colors w-full text-left"
                                            >
                                               <Trash2 className="w-4 h-4" /> Eliminar Asignación
                                            </button>
                                         </div>
                                      </PopoverContent>
                                    )}
                                 </Popover>
                              )}
                           </div>
                        );
                     })}
                  </div>
               ))}

               {members.length === 0 && (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm flex sticky left-0 w-full justify-center">
                     No hay miembros en el equipo. Comienza agregando uno en el panel de administración.
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
