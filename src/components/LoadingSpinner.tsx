import { Loader2 } from "lucide-react";

export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      <p className="mt-2 text-sm text-gray-500">Cargando datos...</p>
    </div>
  );
}
