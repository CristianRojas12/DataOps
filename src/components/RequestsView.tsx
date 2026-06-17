import { format } from "date-fns";
import { useGuardContext } from "../context";
import { CheckCircle2, XCircle, Clock, Trash2 } from "lucide-react";
import { Button } from "./ui/button";

export function RequestsView() {
  const { timeOffRequests, members, session, updateTimeOffRequestStatus, deleteTimeOffRequest } = useGuardContext();
  const isAdmin = session?.role === 'admin';

  // Filter requests: if user, only theirs. If admin, all.
  const visibleRequests = timeOffRequests
    .filter(r => isAdmin || r.memberId === session?.memberId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return <span className="text-green-500">Aprobado</span>;
      case 'rejected': return <span className="text-red-500">Rechazado</span>;
      default: return <span className="text-yellow-500">Pendiente</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0f111a] text-gray-900 dark:text-gray-100 p-6 overflow-hidden">
      <h2 className="text-xl font-medium mb-6 shrink-0">
        {isAdmin ? "Bandeja de Solicitudes" : "Mis Solicitudes"}
      </h2>

      <div className="flex-1 overflow-y-auto pr-4 pb-12">
        <div className="space-y-4">
          {visibleRequests.map(req => {
             const member = members.find(m => m.id === req.memberId);

             return (
               <div key={req.id} className="bg-white dark:bg-[#1a1c29] border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <span className="font-medium text-gray-900 dark:text-gray-100">{member?.name}</span>
                       <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                          {req.type === 'vacaciones' ? 'Vacaciones' : 'Días x Guardia'}
                       </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 flex gap-4">
                       <span>Del: {format(req.startDate, 'dd/MM/yyyy')}</span>
                       <span>Al: {format(req.endDate, 'dd/MM/yyyy')}</span>
                    </div>
                    {req.reason && (
                       <p className="text-sm text-gray-600 mt-2 italic">"{req.reason}"</p>
                    )}
                 </div>

                 <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                       {getStatusIcon(req.status)}
                       <span className="font-medium text-sm">{getStatusLabel(req.status)}</span>
                    </div>

                    {isAdmin && (
                       <div className="flex items-center gap-2">
                          {req.status === 'pending' && (
                             <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                                  onClick={() => updateTimeOffRequestStatus(req.id, 'rejected')}
                                >
                                   Rechazar
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-amber-400 hover:bg-amber-500 text-gray-900"
                                  onClick={() => updateTimeOffRequestStatus(req.id, 'approved')}
                                >
                                   Aprobar
                                </Button>
                             </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8 ml-2"
                            onClick={() => {
                               if (window.confirm("¿Seguro que deseas eliminar esta solicitud permanentemente?")) {
                                  deleteTimeOffRequest(req.id);
                               }
                            }}
                            title="Eliminar Solicitud"
                          >
                             <Trash2 className="w-4 h-4" />
                          </Button>
                       </div>
                    )}
                 </div>
               </div>
             );
          })}

          {visibleRequests.length === 0 && (
             <div className="text-center text-gray-500 dark:text-gray-400 py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg bg-white/50 dark:bg-[#13151f]">
               No hay solicitudes para mostrar.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
