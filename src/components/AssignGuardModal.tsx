import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, isSameWeek, eachWeekOfInterval } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { useGuardContext } from "../context";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const formSchema = z.object({
  memberId: z.string().min(1, "Selecciona un miembro"),
  type: z.enum(["Guardia Matutina", "Guardia Vespertina"] as const),
  dateRange: z.object({
    from: z.date({ message: "Fecha inicial requerida" }),
    to: z.date().optional(),
  }).refine((data) => data.from, { message: "Selecciona un rango de fechas" }),
});

export function AssignGuardModal() {
  const [open, setOpen] = useState(false);
  const { members, guards, assignGuard } = useGuardContext();
  const [conflictError, setConflictError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      memberId: "",
      type: "Guardia Matutina",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setConflictError(null);
    const { from, to } = values.dateRange;
    const finalTo = to || from; // Si no hay fecha final (doble click no hecho), se toma un solo dia

    // Validacion: Solo 1 miembro asignado por semana para "Guardia Matutina" y 1 para "Guardia Vespertina".
    // Obtenemos todas las semanas que abarca el rango solicitado.
    const requestedWeeks = eachWeekOfInterval({ start: from, end: finalTo }, { weekStartsOn: 1 });

    let foundConflict = false;

    // Para cada guardia existente
    for (const guard of guards) {
      // Verificamos si es del mismo tipo
      if (guard.type === values.type) {
        // Obtenemos las semanas que abarca esta guardia
        const guardWeeks = eachWeekOfInterval({ start: guard.startDate, end: guard.endDate }, { weekStartsOn: 1 });

        // Si hay intersección entre las semanas solicitadas y las semanas de la guardia existente, es un conflicto
        const overlaps = requestedWeeks.some(rw =>
          guardWeeks.some(gw => isSameWeek(rw, gw, { weekStartsOn: 1 }))
        );

        if (overlaps) {
          foundConflict = true;
          break;
        }
      }
    }

    if (foundConflict) {
      setConflictError(
        `Ya existe una asignación de ${values.type} para alguna de las semanas seleccionadas.`
      );
      return;
    }

    assignGuard({
      memberId: values.memberId,
      type: values.type,
      startDate: from,
      endDate: finalTo,
    });
    setOpen(false);
    form.reset();
  }

  // Lógica customizada para el rango de fechas para evitar que se "trabe"
  // React Day Picker mode="range" puede ser molesto si se quiere reiniciar.
  // Permitiendo setear onChange con min=1 dia
  const handleDateSelect = (newDateRange: any, onChange: (val: any) => void) => {
    // Si solo viene 'from', y 'to' es undefined (significa que el usuario clickeo un nuevo dia inicial)
    onChange(newDateRange);
    setConflictError(null); // Clear error on change
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-amber-400 hover:bg-amber-500 text-gray-900 gap-2 h-9 px-4 w-auto min-w-[140px] rounded-md text-sm font-medium transition-colors flex items-center justify-center">
          <span className="text-lg leading-none mb-[2px]">+</span> Asignar Guardias
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#1a1c29] border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-normal">
            Asignar Guardias
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="memberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿Para quién?</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white dark:bg-[#13151f] border-gray-200 dark:border-gray-800">
                          <SelectValue placeholder="Selecciona..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white dark:bg-[#13151f] border-gray-200 dark:border-gray-800">
                        {members.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Guardia</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white dark:bg-[#13151f] border-gray-200 dark:border-gray-800">
                          <SelectValue placeholder="Selecciona..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white dark:bg-[#13151f] border-gray-200 dark:border-gray-800">
                        <SelectItem value="Guardia Matutina">
                          Guardia Matutina
                        </SelectItem>
                        <SelectItem value="Guardia Vespertina">
                          Guardia Vespertina
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dateRange"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Rango de Fechas</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal bg-white dark:bg-[#13151f] border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1f2233]",
                            !field.value?.from ? "text-gray-500 dark:text-gray-400" : "dark:text-gray-100"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value?.from ? (
                            field.value.to ? (
                              <>
                                {format(field.value.from, "LLL dd, y")} -{" "}
                                {format(field.value.to, "LLL dd, y")}
                              </>
                            ) : (
                              format(field.value.from, "LLL dd, y")
                            )
                          ) : (
                            <span>Selecciona fechas</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white dark:bg-[#1a1c29] border-gray-200 dark:border-gray-800" align="start">
                      <Calendar
                        mode="range"
                        defaultMonth={field.value?.from}
                        selected={{
                          from: field.value?.from,
                          to: field.value?.to,
                        }}
                        onSelect={(range) => handleDateSelect(range, field.onChange)}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {conflictError && (
              <div className="text-red-500 text-sm mt-2">{conflictError}</div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#1f2233]"
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-amber-400 hover:bg-amber-500 text-gray-900">
                Registrar Asignación
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
