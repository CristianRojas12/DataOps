import { useState } from "react";
import { format, addDays, startOfWeek, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { useGuardContext } from "../context";
import { Plus } from "lucide-react";
import { Button } from "./ui/button";

export function MainCalendarView() {
  const { members, guards, addMember } = useGuardContext();
  const [currentDate] = useState(new Date());

  // Generate 4 weeks starting from the current week
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
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

  return (
    <div className="flex h-[calc(100vh-100px)] overflow-hidden">
      {/* Left Panel: Member List */}
      <div className="w-[300px] border-r border-border/50 shrink-0 flex flex-col bg-[#0b0c10]/50 z-10">
        <div className="h-[4.5rem] border-b border-border/50 flex items-center px-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20 h-10"
            onClick={handleAddMember}
          >
            <Plus className="mr-2 h-4 w-4" />
            Crear nuevo miembro
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 px-4 h-14 hover:bg-white/5 transition-colors cursor-pointer border-b border-transparent">
              <div className="w-10 h-10 rounded-full bg-indigo-600/80 border border-indigo-500 flex items-center justify-center text-sm font-medium text-white shadow-sm">
                {member.name.charAt(0)}
              </div>
              <span className="text-sm font-medium text-gray-200">{member.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel: Timeline */}
      <div className="flex-1 overflow-x-auto overflow-y-auto bg-[#0f111a]">
        <div className="min-w-max pb-12">
          {/* Header row for month/year and days of week */}
          <div className="flex h-[4.5rem] border-b border-border/50 text-sm text-muted-foreground sticky top-0 bg-[#0f111a] z-0">
            {weeks.map((week, i) => (
              <div key={i} className="flex flex-col border-r border-border/50 last:border-0 relative px-1">
                {/* Month/Year label (only show on first week or when month changes, simplified here) */}
                {i === 0 && (
                   <div className="absolute -top-10 left-4 text-xs font-medium text-gray-400">
                     {format(startDate, "dd/MM/yyyy")} a {format(addDays(startDate, 27), "dd/MM/yyyy")}
                   </div>
                )}
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
                      return (
                        <div
                          key={j}
                          className="w-[3.5rem] flex items-center justify-center px-0.5"
                        >
                          <div
                            className={`w-full h-full rounded-md flex items-center justify-center text-xs font-medium transition-all ${
                              guard
                                ? guard.type === "Guardia Matutina"
                                  ? "bg-indigo-600/90 text-white shadow-sm ring-1 ring-indigo-500/50" // Matutina color
                                  : "bg-slate-500/90 text-white shadow-sm ring-1 ring-slate-400/50" // Vespertina color
                                : "bg-[#1e2130]/40 text-gray-500 hover:bg-[#25293c]/60" // Default cell
                            }`}
                            title={guard ? `${guard.type} - ${member.name}` : undefined}
                          >
                             {guard ? (
                               // If it's the start of the guard or monday, maybe show an icon, otherwise just the number or solid color
                               // For simplicity, just showing the day number inside the colored block
                               format(day, "d")
                             ) : (
                               format(day, "d")
                             )}
                          </div>
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
