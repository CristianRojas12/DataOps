import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { useGuardContext } from "../context";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function SummaryView() {
  const { members, guards } = useGuardContext();
  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id || "");
  const [currentYear] = useState(new Date().getFullYear());

  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const memberGuards = guards.filter((g) => g.memberId === selectedMemberId);

  const matutinaDays = memberGuards
    .filter((g) => g.type === "Guardia Matutina")
    .reduce((total, g) => {
      return total + eachDayOfInterval({ start: g.startDate, end: g.endDate }).length;
    }, 0);

  const vespertinaDays = memberGuards
    .filter((g) => g.type === "Guardia Vespertina")
    .reduce((total, g) => {
      return total + eachDayOfInterval({ start: g.startDate, end: g.endDate }).length;
    }, 0);

  const months = Array.from({ length: 12 }).map((_, i) => new Date(currentYear, i, 1));

  const hasGuardOnDay = (date: Date) => {
    return memberGuards.find((g) =>
      isWithinInterval(date, { start: g.startDate, end: g.endDate })
    );
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 p-6 overflow-hidden">
      {/* Left Panel: Summary Stats */}
      <div className="w-64 flex-shrink-0 space-y-6 overflow-y-auto pr-2">
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Miembro</label>
          <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
            <SelectTrigger className="bg-[#13151f] border-border">
              <SelectValue placeholder="Selecciona un miembro" />
            </SelectTrigger>
            <SelectContent className="bg-[#13151f] border-border">
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="bg-[#13151f] border-border text-foreground">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Asignación de Guardias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                Matutina
              </span>
              <span className="font-semibold">{matutinaDays} Días</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                Vespertina
              </span>
              <span className="font-semibold">{vespertinaDays} Días</span>
            </div>
            <div className="pt-4 mt-4 border-t border-border flex justify-between items-center">
              <span className="font-medium">Total Guardias</span>
              <span className="font-semibold">{matutinaDays + vespertinaDays}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel: Month Cards Grid */}
      <div className="flex-1 overflow-y-auto pr-4 pb-12">
        <h2 className="text-xl font-medium mb-6">
          Calendario de {selectedMember?.name}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {months.map((month) => {
            const start = startOfMonth(month);
            const end = endOfMonth(month);
            // Get all days to render including offset for the first day of month
            const firstDayOfWeek = startOfWeek(start, { weekStartsOn: 1 });
            const prefixDays = eachDayOfInterval({ start: firstDayOfWeek, end: start }).slice(0, -1);
            const monthDays = eachDayOfInterval({ start, end });

            return (
              <Card key={month.toISOString()} className="bg-[#13151f] border-border text-foreground">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-base font-normal capitalize">
                    {format(month, "MMMM", { locale: es })}
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
                      const guard = hasGuardOnDay(day);
                      return (
                        <div
                          key={i}
                          className={`h-8 flex items-center justify-center rounded-md ${
                            guard
                              ? guard.type === "Guardia Matutina"
                                ? "bg-orange-500 text-white"
                                : "bg-purple-500 text-white"
                              : "text-muted-foreground hover:bg-white/5"
                          }`}
                        >
                          {format(day, "d")}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
