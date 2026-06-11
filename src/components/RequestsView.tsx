import { format } from "date-fns";
import { useGuardContext } from "../context";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "./ui/button";

export function RequestsView() {
  const { timeOffRequests, members, session, updateTimeOffRequestStatus } = useGuardContext();
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
    <div className="flex flex-col h-full bg-[#0f111a] text-foreground p-6 overflow-hidden">
      <h2 className="text-xl font-medium mb-6 shrink-0">
        {isAdmin ? "Bandeja de Solicitudes (Admin)" : "Mis Solicitudes"}
      </h2>

      <div className="flex-1 overflow-y-auto pr-4 pb-12">
        <div className="space-y-4">
          {visibleRequests.map(req => {
             const member = members.find(m => m.id === req.memberId);

             return (
               <div key={req.id} className="bg-[#13151f] border border-border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <span className="font-medium text-white">{member?.name}</span>
                       <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                          {req.type === 'vacaciones' ? 'Vacaciones' : 'Días x Guardia'}
                       </span>
                    </div>
                    <div className="text-sm text-muted-foreground flex gap-4">
                       <span>Del: {format(req.startDate, 'dd/MM/yyyy')}</span>
                       <span>Al: {format(req.endDate, 'dd/MM/yyyy')}</span>
                    </div>
                    {req.reason && (
                       <p className="text-sm text-gray-400 mt-2 italic">"{req.reason}"</p>
                    )}
                 </div>

                 <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                       {getStatusIcon(req.status)}
                       <span className="font-medium text-sm">{getStatusLabel(req.status)}</span>
                    </div>

                    {isAdmin && req.status === 'pending' && (
                       <div className="flex items-center gap-2">
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
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => updateTimeOffRequestStatus(req.id, 'approved')}
                          >
                             Aprobar
                          </Button>
                       </div>
                    )}
                 </div>
               </div>
             );
          })}

          {visibleRequests.length === 0 && (
             <div className="text-center text-muted-foreground py-12 border border-dashed border-border rounded-lg bg-[#13151f]/50">
               No hay solicitudes para mostrar.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
