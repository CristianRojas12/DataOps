import { useState, useEffect, useRef } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, startOfWeek,  isSunday, isSaturday, lastDayOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { useGuardContext } from "../context";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { LoadingSpinner } from "./LoadingSpinner";
import { AlertTriangle, CalendarRange, Calendar } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

type FilterMode = "currentMonth" | "ytd";

export function SummaryView() {
  const { members, guards, holidays, isLoading } = useGuardContext();
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [filterMode, setFilterMode] = useState<FilterMode>("currentMonth");
  const [currentYear] = useState(new Date().getFullYear());
  const [currentMonthIndex] = useState(new Date().getMonth());
  const monthRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (members.length > 0 && !selectedMemberId) {
      setSelectedMemberId(members[0].id);
    }
  }, [members, selectedMemberId]);

  useEffect(() => {
    // Scroll to current month on mount
    const currentMonthEl = monthRefs.current[currentMonthIndex];
    if (currentMonthEl) {
      currentMonthEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isLoading, currentMonthIndex]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const months = Array.from({ length: 12 }).map((_, i) => new Date(currentYear, i, 1));
  const currentMonthDate = months[currentMonthIndex];

  // Helper to check if a day is a holiday
  const isHoliday = (date: Date) => {
    return holidays.some(h => h.getTime() === date.getTime());
  };

  // Helper to check if a date is the last Saturday of its month
  const isLastSaturdayOfMonth = (date: Date) => {
    if (!isSaturday(date)) return false;
    const endOfMonthDate = lastDayOfMonth(date);
    // If the difference between this date and the end of the month is less than 7 days, it's the last one.
    const diffTime = Math.abs(endOfMonthDate.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 7;
  };

  // Métricas
  const getMetricsForMember = (memberId: string) => {
    const memberGuards = guards.filter((g) => g.memberId === memberId);
    let totalDays = 0;
    let weekendDays = 0;
    let holidayCount = 0;

    const today = new Date();

    memberGuards.forEach((g) => {
      const days = eachDayOfInterval({ start: g.startDate, end: g.endDate });

      const filteredDays = days.filter(d => {
        if (filterMode === "currentMonth") {
          return d.getMonth() === currentMonthIndex && d.getFullYear() === currentYear;
        } else {
          // YTD: From start of year up to today
          return d.getFullYear() === currentYear && d.getTime() <= today.getTime();
        }
      });

      totalDays += filteredDays.length;

      // Calculate weekend logic
      filteredDays.forEach(d => {
        if (isSunday(d)) {
          weekendDays += 1;
        } else if (isLastSaturdayOfMonth(d) && g.type === "Guardia Vespertina") {
          weekendDays += 1;
        }

        if (isHoliday(d)) {
          holidayCount += 1;
        }
      });
    });

    // Check Rule 1: Two consecutive weeks (Burnout rule is usually evaluated based on the current context)
    let hasConsecutiveWeeks = false;
    const memberWeeks = memberGuards
      .flatMap(g => eachDayOfInterval({ start: g.startDate, end: g.endDate }))
      .filter(d => {
        if (filterMode === "currentMonth") {
          return d.getMonth() === currentMonthIndex && d.getFullYear() === currentYear;
        } else {
          return d.getFullYear() === currentYear && d.getTime() <= today.getTime();
        }
      })
      .map(d => format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')); // Group by week start

    const uniqueWeeks = Array.from(new Set(memberWeeks)).sort();

    for (let i = 0; i < uniqueWeeks.length - 1; i++) {
      const currentWeekStart = new Date(uniqueWeeks[i]);
      const nextWeekStart = new Date(uniqueWeeks[i + 1]);
      // If the difference is exactly 7 days, they are consecutive
      if ((nextWeekStart.getTime() - currentWeekStart.getTime()) / (1000 * 3600 * 24) === 7) {
        hasConsecutiveWeeks = true;
        break;
      }
    }

    return { totalDays, weekendDays, holidayCount, hasConsecutiveWeeks };
  };

  // Promedio General del Equipo
  let totalTeamDays = 0;
  const today = new Date();

  guards.forEach((g) => {
    const days = eachDayOfInterval({ start: g.startDate, end: g.endDate });
    const filteredDays = days.filter(d => {
        if (filterMode === "currentMonth") {
          return d.getMonth() === currentMonthIndex && d.getFullYear() === currentYear;
        } else {
          return d.getFullYear() === currentYear && d.getTime() <= today.getTime();
        }
    });
    totalTeamDays += filteredDays.length;
  });

  const teamAverage = members.length > 0 ? totalTeamDays / members.length : 0;

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 p-6 overflow-hidden">
      {/* Left Panel: Summary Stats (Fixed/Sticky) */}
      <div className="w-80 flex-shrink-0 space-y-6 sticky top-0 self-start overflow-y-auto max-h-full pr-2">
        <div className="bg-[#13151f] p-4 rounded-lg border border-border">
          <div className="flex justify-between items-center mb-3">
             <label className="text-sm font-medium">
               Métricas ({filterMode === 'currentMonth' ? format(currentMonthDate, "MMMM", { locale: es }) : 'YTD'})
             </label>
             <button
                onClick={() => setFilterMode(prev => prev === 'currentMonth' ? 'ytd' : 'currentMonth')}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
                title={filterMode === 'currentMonth' ? "Ver Acumulado del Año (YTD)" : "Ver Mes Actual"}
             >
               {filterMode === 'currentMonth' ? <CalendarRange className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
             </button>
          </div>
          <div className="text-sm flex justify-between">
            <span className="text-muted-foreground">Promedio de días/miembro:</span>
            <span className="font-semibold text-white">{teamAverage.toFixed(1)} días</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium mb-2 block">Miembros y Burnout</label>
          <TooltipProvider>
            {members.map((member) => {
              const metrics = getMetricsForMember(member.id);

              // Rule 2: Deviation > 30% if average > 2
              const isOverloaded = teamAverage > 2 && metrics.totalDays >= (teamAverage * 1.3);
              const isBurnoutRisk = metrics.hasConsecutiveWeeks || isOverloaded;

              let burnoutReason = "";
              if (metrics.hasConsecutiveWeeks && isOverloaded) {
                burnoutReason = `Riesgo de Burnout: Semanas consecutivas asignadas y carga supera en un ${((metrics.totalDays / teamAverage - 1) * 100).toFixed(0)}% el promedio del equipo (${teamAverage.toFixed(1)} días).`;
              } else if (metrics.hasConsecutiveWeeks) {
                burnoutReason = "Riesgo de Burnout: Semanas consecutivas asignadas.";
              } else if (isOverloaded) {
                burnoutReason = `Riesgo de Burnout: Su carga actual supera en un ${((metrics.totalDays / teamAverage - 1) * 100).toFixed(0)}% el promedio del equipo (${teamAverage.toFixed(1)} días).`;
              }

              const isSelected = selectedMemberId === member.id;

              return (
                <div
                  key={member.id}
                  className={`p-3 rounded-md border cursor-pointer transition-colors ${isSelected ? 'bg-indigo-900/30 border-indigo-500/50' : 'bg-[#13151f] border-border hover:bg-[#1a1c29]'}`}
                  onClick={() => setSelectedMemberId(member.id)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm text-gray-200">{member.name}</span>
                    {isBurnoutRisk && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#1a1c29] border-border text-white max-w-[200px]">
                          <p>{burnoutReason}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
                    <span>Total: {metrics.totalDays} días</span>
                    <span className="flex gap-2">
                       <span>Fines de semana: {metrics.weekendDays}</span>
                       <span>Feriados: {metrics.holidayCount}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </TooltipProvider>
        </div>
      </div>

      {/* Right Panel: Month Cards Grid (Scrollable) */}
      <div className="flex-1 overflow-y-auto pr-4 pb-12">
        <h2 className="text-xl font-medium mb-6 sticky top-0 bg-[#0f111a] py-2 z-10">
          Calendario de {selectedMember?.name || "..."}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {months.map((month, index) => {
            const start = startOfMonth(month);
            const end = endOfMonth(month);
            const firstDayOfWeek = startOfWeek(start, { weekStartsOn: 1 });
            const prefixDays = eachDayOfInterval({ start: firstDayOfWeek, end: start }).slice(0, -1);
            const monthDays = eachDayOfInterval({ start, end });

            // Garantizar simetría rellenando con espacios vacíos para tener siempre 42 celdas (6 semanas)
            const totalCellsRendered = prefixDays.length + monthDays.length;
            const suffixDaysLength = 42 - totalCellsRendered;
            const suffixDays = Array.from({ length: suffixDaysLength });

            const isCurrentMonth = index === currentMonthIndex;

            return (
              <div key={month.toISOString()} ref={el => { monthRefs.current[index] = el; }}>
                <Card className={`bg-[#13151f] border-border text-foreground transition-all duration-300 min-h-[300px] ${isCurrentMonth ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/10' : ''}`}>
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-base font-normal capitalize flex justify-center items-center gap-2">
                      {format(month, "MMMM", { locale: es })}
                      {isCurrentMonth && <span className="w-2 h-2 rounded-full bg-indigo-500" title="Mes Actual"></span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-muted-foreground">
                      {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                        <div key={i}>{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-sm">
                      {prefixDays.map((_, i) => (
                        <div key={`empty-prefix-${i}`} className="h-8"></div>
                      ))}
                      {monthDays.map((day, i) => {
                        const guard = guards.find(g =>
                          g.memberId === selectedMemberId &&
                          isWithinInterval(day, { start: g.startDate, end: g.endDate })
                        );

                        const isHol = isHoliday(day);

                        return (
                          <div
                            key={i}
                            className={`h-8 flex items-center justify-center rounded-md ${
                              guard
                                ? "text-white"
                                : "text-muted-foreground hover:bg-white/5"
                            } ${isHol && !guard ? 'ring-1 ring-amber-500/50 text-amber-200 bg-amber-500/10' : ''} ${isHol && guard ? 'ring-2 ring-white' : ''}`}
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
                            title={isHol ? "Feriado" : ""}
                          >
                            {format(day, "d")}
                          </div>
                        );
                      })}
                      {suffixDays.map((_, i) => (
                         <div key={`empty-suffix-${i}`} className="h-8"></div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
