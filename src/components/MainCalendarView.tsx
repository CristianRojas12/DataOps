import { useState } from "react";
import { format, addDays, startOfWeek, endOfWeek, isWithinInterval, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { useGuardContext } from "../context";
import { Plus, Trash, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { LoadingSpinner } from "./LoadingSpinner";

export function MainCalendarView() {
  const { members, guards, isLoading, session, addMember, removeGuard, removeMember } = useGuardContext();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Navigation Logic
  // The grid must strictly start on Monday and end on Sunday.
  // We'll calculate a 4-week span starting from the Monday of the current week selected.
  const handlePrevWeek = () => setCurrentDate(subDays(currentDate, 7));
  const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));

  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  // Render exactly 4 weeks from startDate
  const endDate = endOfWeek(addDays(startDate, 21), { weekStartsOn: 1 });

  const weeks = Array.from({ length: 4 }).map((_, weekIndex) => {
    return Array.from({ length: 7 }).map((_, dayIndex) => {
      return addDays(startDate, weekIndex * 7 + dayIndex);
    });
  });

  const handleAddMember = () => {
    const name = prompt("Nombre del nuevo miembro:");
    if (name) addMember(name);
  };

  const getGuardForMemberAndDay = (memberId: string, date: Date) => {
    return guards.find(
      (g) =>
        g.memberId === memberId &&
        isWithinInterval(date, { start: g.startDate, end: g.endDate })
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex h-[calc(100vh-100px)] overflow-hidden">
      {/* Left Panel: Member List */}
      <div className="w-[300px] border-r border-border/50 shrink-0 flex flex-col bg-[#0b0c10]/50 z-10">
        <div className="h-[4.5rem] border-b border-border/50 flex items-center px-4">
          {session.role === 'admin' ? (
            <Button
              variant="ghost"
              className="w-full justify-start text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20 h-10"
              onClick={handleAddMember}
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear nuevo miembro
            </Button>
          ) : (
            <div className="w-full text-indigo-400 font-medium px-4 h-10 flex items-center">
              Miembros del Equipo
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between px-4 h-14 hover:bg-white/5 transition-colors cursor-pointer border-b border-transparent group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600/80 border border-indigo-500 flex items-center justify-center text-sm font-medium text-white shadow-sm">
                  {member.name.charAt(0)}
                </div>
                <span className="text-sm font-medium text-gray-200">{member.name}</span>
              </div>
              {session.role === 'admin' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 hover:bg-red-900/20 transition-all h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`¿Estás seguro de eliminar a ${member.name}? Se eliminarán todas sus guardias.`)) {
                      removeMember(member.id);
                    }
                  }}
                  title="Eliminar miembro"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel: Timeline */}
      <div className="flex-1 overflow-x-auto overflow-y-auto bg-[#0f111a]">
        <div className="min-w-max pb-12">
          {/* Header row for month/year and days of week */}
          <div className="flex h-[4.5rem] border-b border-border/50 text-sm text-muted-foreground sticky top-0 bg-[#0f111a] z-0">
            {/* Filter controls placed above the first week */}
            <div className="absolute top-2 left-4 z-20 flex items-center gap-2 bg-[#1a1c29] p-1 rounded-md border border-border shadow-sm">
              <Button variant="ghost" size="icon" onClick={handlePrevWeek} className="h-6 w-6">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium text-gray-200">
                {format(startDate, "dd/MM/yyyy")} - {format(endDate, "dd/MM/yyyy")}
              </span>
              <Button variant="ghost" size="icon" onClick={handleNextWeek} className="h-6 w-6">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Offset the days headers downwards to make room for the absolute controller */}
            {weeks.map((week, i) => (
              <div key={i} className="flex flex-col border-r border-border/50 last:border-0 relative px-1 pt-6">
                <div className="flex flex-1 items-end pb-2">
                  {week.map((day, j) => (
                    <div key={j} className="w-[3.5rem] flex flex-col items-center justify-center">
                      <span className="text-xs font-medium text-gray-500 lowercase">{format(day, "EEEEEE", { locale: es })}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Grid rows for members */}
          <div className="py-2">
            {members.map((member) => (
              <div key={member.id} className="flex h-14 items-center hover:bg-white/[0.02] transition-colors border-b border-transparent">
                {weeks.map((week, i) => (
                  <div key={i} className="flex border-r border-border/20 last:border-0 h-full py-2 px-1">
                    {week.map((day, j) => {
                      const guard = getGuardForMemberAndDay(member.id, day);

                      const cellContent = (
                        <div
                          className={`w-full h-full rounded-md flex items-center justify-center text-xs font-medium transition-all ${
                            guard
                              ? "text-white shadow-sm ring-1 ring-white/10"
                              : "bg-[#1e2130] text-gray-500 hover:bg-[#25293c]" // Fondo oscuro neutro
                          }`}
                          style={
                            guard
                              ? {
                                  backgroundColor:
                                    guard.type === "Guardia Matutina"
                                      ? "#F97316"
                                      : "#A855F7",
                                }
                              : {}
                          }
                          title={guard ? `${guard.type} - ${member.name}` : undefined}
                        >
                           {format(day, "d")}
                        </div>
                      );

                      return (
                        <div
                          key={j}
                          className="w-[3.5rem] flex items-center justify-center px-0.5"
                        >
                          {guard && session.role === 'admin' ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="w-full h-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20 rounded-md">
                                  {cellContent}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-3 bg-[#13151f] border-border text-white">
                                <p className="text-sm font-medium mb-2">{guard.type}</p>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeGuard(guard.id)}
                                  className="w-full bg-red-600 hover:bg-red-700"
                                >
                                  <Trash className="w-4 h-4 mr-2" />
                                  Eliminar Asignación
                                </Button>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            cellContent
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
