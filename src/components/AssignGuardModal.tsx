import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, isSameWeek, startOfWeek } from "date-fns";
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
    to: z.date({ message: "Fecha final requerida" }),
  }),
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

    // Validation: 1 member per week for Matutina, 1 for Vespertina
    // Here we check if ANY guard of the SAME TYPE overlaps with the requested weeks
    // We simplify by checking if the start date falls into a week that already has that type
    const requestedWeek = startOfWeek(from, { weekStartsOn: 1 });

    const hasConflict = guards.some((guard) => {
      const guardWeek = startOfWeek(guard.startDate, { weekStartsOn: 1 });
      return (
        guard.type === values.type &&
        isSameWeek(requestedWeek, guardWeek, { weekStartsOn: 1 })
      );
    });

    if (hasConflict) {
      setConflictError(
        `Ya existe una asignación de ${values.type} para esta semana.`
      );
      return;
    }

    assignGuard({
      memberId: values.memberId,
      type: values.type,
      startDate: from,
      endDate: to,
    });
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <span className="text-lg leading-none mb-[2px]">+</span> Asignar Guardias
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-[#1a1c29] border-border text-foreground">
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
                        <SelectTrigger className="bg-[#13151f] border-border">
                          <SelectValue placeholder="Selecciona..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#13151f] border-border">
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
                        <SelectTrigger className="bg-[#13151f] border-border">
                          <SelectValue placeholder="Selecciona..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#13151f] border-border">
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
                            "w-full justify-start text-left font-normal bg-[#13151f] border-border hover:bg-[#1f2233] hover:text-white",
                            !field.value?.from && "text-muted-foreground"
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
                    <PopoverContent className="w-auto p-0 bg-[#1a1c29] border-border" align="start">
                      <Calendar
                        mode="range"
                        defaultMonth={field.value?.from}
                        selected={{
                          from: field.value?.from,
                          to: field.value?.to,
                        }}
                        onSelect={field.onChange}
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
                className="text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Registrar Asignación
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
