import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Search, Trash2 } from "lucide-react";
import { useGuardContext } from "../context";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { LoadingSpinner } from "./LoadingSpinner";


export function MainCalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { members, guards, holidays, removeGuard, isLoading, session } = useGuardContext();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Set standard grid
  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start, end });
  const firstDayOfWeek = startOfWeek(start, { weekStartsOn: 1 });
  const prefixDays = eachDayOfInterval({ start: firstDayOfWeek, end: start }).slice(0, -1);

  // Rellenar para garantizar las celdas necesarias para la primera semana

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const isHoliday = (date: Date) => {
    return holidays.some(h => h.getTime() === date.getTime());
  };

  return (
    <div className="flex flex-col h-full bg-[#0f111a] text-foreground p-6 overflow-hidden">
      {/* Calendar Header Tools */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-[#13151f] rounded-md border border-border p-1">
            <button onClick={prevMonth} className="p-1.5 hover:bg-white/5 rounded-md transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="min-w-[120px] text-center font-medium capitalize text-sm">
              {format(currentDate, "MMMM yyyy", { locale: es })}
            </span>
            <button onClick={nextMonth} className="p-1.5 hover:bg-white/5 rounded-md transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button className="text-sm px-3 py-1.5 bg-[#13151f] border border-border rounded-md hover:bg-white/5 transition-colors flex items-center gap-2">
            Mes Actual
          </button>
        </div>

        <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                 type="text"
                 placeholder="Buscar miembro..."
                 className="pl-9 pr-4 py-1.5 bg-[#13151f] border border-border rounded-md text-sm w-64 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-3 text-xs">
               <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#F97316" }}></span>
                  <span className="text-muted-foreground">Matutina</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#A855F7" }}></span>
                  <span className="text-muted-foreground">Vespertina</span>
               </div>
            </div>
        </div>
      </div>

      {/* Main Grid Area - Horizontal Scroll */}
      <div className="flex-1 overflow-x-auto overflow-y-auto border border-border rounded-lg bg-[#13151f] relative">
         <div className="w-max min-w-full">
            {/* Header Row (Days) */}
            <div className="flex border-b border-border sticky top-0 bg-[#13151f] z-40">
               {/* Fixed Member Column Header */}
               <div className="w-48 shrink-0 border-r border-border p-3 sticky left-0 z-50 bg-[#13151f]">
                  <span className="text-sm font-medium text-muted-foreground">Miembros ({members.length})</span>
               </div>

               {/* Empty prefix cells for alignment */}
               {prefixDays.map((_, i) => (
                  <div key={`header-prefix-${i}`} className="w-12 shrink-0 border-r border-border/50 bg-[#1a1c29]/50"></div>
               ))}

               {/* Days Headers */}
               {monthDays.map((day, i) => {
                  const isHol = isHoliday(day);
                  return (
                  <div key={`header-${i}`} className={`w-12 shrink-0 flex flex-col items-center justify-center py-2 border-r border-border ${isHol ? 'bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/50' : 'bg-[#13151f]'}`} title={isHol ? "Feriado" : ""}>
                     <span className={`text-[10px] uppercase ${isHol ? 'text-amber-200' : 'text-muted-foreground'}`}>{format(day, "EEEEEE", { locale: es })}</span>
                     <span className={`text-sm font-medium ${isHol ? 'text-amber-400' : ''}`}>{format(day, "d")}</span>
                  </div>
               )})}
            </div>

            {/* Members Rows */}
            <div className="flex flex-col relative z-0">
               {members.map(member => (
                  <div key={member.id} className="flex border-b border-border/50 hover:bg-white/[0.02] transition-colors group">
                     {/* Sticky Member Name */}
                     <div className="w-48 shrink-0 border-r border-border p-3 flex items-center sticky left-0 z-30 bg-[#13151f] group-hover:bg-[#1a1c29] transition-colors">
                        <div className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-medium mr-3">
                           {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-200 truncate">{member.name}</span>
                     </div>

                     {/* Empty prefix cells for alignment */}
                     {prefixDays.map((_, i) => (
                        <div key={`cell-prefix-${i}`} className="w-12 shrink-0 border-r border-border/50 bg-[#1a1c29]/20"></div>
                     ))}

                     {/* Days Cells */}
                     {monthDays.map((day, i) => {
                        const guard = guards.find(g =>
                           g.memberId === member.id &&
                           isWithinInterval(day, { start: g.startDate, end: g.endDate })
                        );

                        return (
                           <div key={`cell-${i}`} className="w-12 shrink-0 border-r border-border/50 p-1 flex items-center justify-center relative">
                              {guard && (
                                 <Popover>
                                    <PopoverTrigger asChild>
                                       <div
                                          className="absolute inset-y-1.5 inset-x-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity z-10"
                                          style={{ backgroundColor: guard.type === 'Guardia Matutina' ? '#F97316' : '#A855F7' }}
                                          title={`${guard.type}`}
                                       />
                                    </PopoverTrigger>
                                    {session?.role === 'admin' && (
                                      <PopoverContent className="w-48 p-2 bg-[#1a1c29] border-border z-50">
                                         <div className="flex flex-col gap-2 text-sm">
                                            <div className="font-medium">{guard.type}</div>
                                            <div className="text-xs text-muted-foreground mb-2">
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
                  <div className="p-8 text-center text-muted-foreground text-sm flex sticky left-0 w-full justify-center">
                     No hay miembros en el equipo. Comienza agregando uno en el panel de administración.
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
