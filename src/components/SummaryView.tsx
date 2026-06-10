import { useState, useEffect, useRef } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, startOfWeek, isWeekend, } from "date-fns";
import { es } from "date-fns/locale";
import { useGuardContext } from "../context";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

import { LoadingSpinner } from "./LoadingSpinner";
import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

export function SummaryView() {
  const { members, guards, isLoading } = useGuardContext();
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
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

  // Métricas
  const getMetricsForMember = (memberId: string) => {
    const memberGuards = guards.filter((g) => g.memberId === memberId);
    let totalDays = 0;
    let weekendDays = 0;

    memberGuards.forEach((g) => {
      const days = eachDayOfInterval({ start: g.startDate, end: g.endDate });
      // Filtrar solo los días del mes actual para el cálculo de burnout del mes actual
      const daysInCurrentMonth = days.filter(d => d.getMonth() === currentMonthIndex && d.getFullYear() === currentYear);

      totalDays += daysInCurrentMonth.length;
      weekendDays += daysInCurrentMonth.filter(isWeekend).length;
    });

    // Check Rule 1: Two consecutive weeks
    let hasConsecutiveWeeks = false;
    const memberWeeksInMonth = memberGuards
      .flatMap(g => eachDayOfInterval({ start: g.startDate, end: g.endDate }))
      .filter(d => d.getMonth() === currentMonthIndex && d.getFullYear() === currentYear)
      .map(d => format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')); // Group by week start

    const uniqueWeeks = Array.from(new Set(memberWeeksInMonth)).sort();

    for (let i = 0; i < uniqueWeeks.length - 1; i++) {
      const currentWeekStart = new Date(uniqueWeeks[i]);
      const nextWeekStart = new Date(uniqueWeeks[i + 1]);
      // If the difference is exactly 7 days, they are consecutive
      if ((nextWeekStart.getTime() - currentWeekStart.getTime()) / (1000 * 3600 * 24) === 7) {
        hasConsecutiveWeeks = true;
        break;
      }
    }

    return { totalDays, weekendDays, hasConsecutiveWeeks };
  };

  // Promedio General del Equipo para el mes en curso
  let totalTeamDays = 0;
  guards.forEach((g) => {
    const days = eachDayOfInterval({ start: g.startDate, end: g.endDate });
    const daysInCurrentMonth = days.filter(d => d.getMonth() === currentMonthIndex && d.getFullYear() === currentYear);
    totalTeamDays += daysInCurrentMonth.length;
  });

  const teamAverage = members.length > 0 ? totalTeamDays / members.length : 0;

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 p-6 overflow-hidden">
      {/* Left Panel: Summary Stats (Fixed/Sticky) */}
      <div className="w-80 flex-shrink-0 space-y-6 sticky top-0 self-start overflow-y-auto max-h-full pr-2">
        <div className="bg-[#13151f] p-4 rounded-lg border border-border">
          <label className="text-sm font-medium mb-3 block">Métricas del Equipo ({format(currentMonthDate, "MMMM", { locale: es })})</label>
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
                  <div className="text-xs text-muted-foreground">
                    [Total: {metrics.totalDays} días] [Fines de semana: {metrics.weekendDays}]
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

            const isCurrentMonth = index === currentMonthIndex;

            return (
              <div key={month.toISOString()} ref={el => { monthRefs.current[index] = el; }}>
                <Card className={`bg-[#13151f] border-border text-foreground transition-all duration-300 ${isCurrentMonth ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/10' : ''}`}>
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
                        <div key={`empty-${i}`} className="h-8"></div>
                      ))}
                      {monthDays.map((day, i) => {
                        const guard = guards.find(g =>
                          g.memberId === selectedMemberId &&
                          isWithinInterval(day, { start: g.startDate, end: g.endDate })
                        );

                        return (
                          <div
                            key={i}
                            className={`h-8 flex items-center justify-center rounded-md ${
                              guard
                                ? "text-white"
                                : "text-muted-foreground hover:bg-white/5"
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
                          >
                            {format(day, "d")}
                          </div>
                        );
                      })}
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
