import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Input } from "./ui/input";
import { useGuardContext } from "../context";
import { useUiStore } from "../store";
import type { TimeOffType } from "../types";

export function RequestTimeOffModal() {
  const { session, members, createTimeOffRequest } = useGuardContext();
  const { timeOffModalOpen, setTimeOffModalOpen } = useUiStore();

  const [type, setType] = useState<TimeOffType>("vacaciones");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState("");

  // Find current member based on session email/id
  const currentMember = members.find(m => m.id === session?.memberId);

  const handleSubmit = async () => {
    if (!currentMember?.id || !type || !startDate || !endDate) return;

    await createTimeOffRequest({
      memberId: currentMember.id,
      type,
      startDate,
      endDate,
      reason: reason || null
    });

    // Reset and close
    setStartDate(undefined);
    setEndDate(undefined);
    setReason("");
    setTimeOffModalOpen(false);
  };

  const handleStartDateSelect = (date: Date | undefined) => {
    setStartDate(date);
    // Auto-fill end date
    if (date) {
      setEndDate(date);
    }
  };

  return (
    <Dialog open={timeOffModalOpen} onOpenChange={setTimeOffModalOpen}>
      <DialogContent className="bg-white dark:bg-[#1a1c29] border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Solicitar Días Libres</DialogTitle>
          <DialogDescription className="text-gray-500">
            Ingresa los detalles de tu solicitud. Tu solicitud quedará en estado pendiente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">

          <div className="grid gap-2">
            <label className="text-sm font-medium">¿Para quién?</label>
            <Input
              value={currentMember?.name || session?.user?.email || ""}
              disabled
              className="bg-white dark:bg-[#13151f] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 opacity-80 cursor-not-allowed focus:ring-2 focus:ring-[#FFE500] focus:border-transparent focus:outline-none dark:focus:ring-gray-700"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Tipo de Permiso</label>
            <Select value={type} onValueChange={(val) => setType(val as TimeOffType)}>
              <SelectTrigger className="bg-white dark:bg-[#13151f] border border-gray-300 dark:border-gray-800 focus:ring-2 focus:ring-[#FFE500] focus:border-transparent focus:outline-none dark:focus:ring-gray-700 font-normal">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#1a1c29] border border-gray-300 dark:border-gray-800">
                <SelectItem value="vacaciones">Vacaciones</SelectItem>
                <SelectItem value="dia_guardia">Días X guardia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Desde</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={`w-full justify-start text-left font-normal bg-white dark:bg-[#13151f] border-gray-200 dark:border-gray-800 ${!startDate ? "text-gray-500 dark:text-gray-400" : "dark:text-gray-100"}`}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white dark:bg-[#1a1c29] border-gray-200 dark:border-gray-800">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={handleStartDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Hasta</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={`w-full justify-start text-left font-normal bg-white dark:bg-[#13151f] border-gray-200 dark:border-gray-800 ${!endDate ? "text-gray-500 dark:text-gray-400" : "dark:text-gray-100"}`}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white dark:bg-[#1a1c29] border-gray-200 dark:border-gray-800">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Motivo (Opcional)</label>
            <textarea
               placeholder="Comentarios adicionales..."
               value={reason}
               onChange={(e: any) => setReason(e.target.value)}
               className="flex w-full rounded-md px-3 py-2 text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE500] focus-visible:border-transparent focus-visible:outline-none dark:focus-visible:ring-gray-700 disabled:cursor-not-allowed disabled:opacity-50 bg-white dark:bg-[#13151f] border border-gray-200 dark:border-gray-800 min-h-[80px]"
            />
          </div>

        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setTimeOffModalOpen(false)} className="text-gray-900 dark:text-gray-100 bg-white dark:bg-[#13151f] border border-gray-300 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-[#1f2233]">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="bg-amber-400 hover:bg-amber-500 text-gray-900" disabled={!startDate || !endDate}>
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
