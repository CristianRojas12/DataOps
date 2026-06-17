import { createContext, useContext, useState, useEffect } from "react";
import type { Member, GuardAssignment, GuardAssignmentUI, UserSession, Role, DimCalendarRow, TimeOffRequestUI, TimeOffRequestDB, TimeOffStatus } from "./types";
import { supabase } from "./lib/supabase";
import { parseISO, format } from "date-fns";
import { LoginView } from "./components/LoginView";
import { LoadingSpinner } from "./components/LoadingSpinner";

interface GuardContextType {
  members: Member[];
  guards: GuardAssignmentUI[];
  timeOffRequests: TimeOffRequestUI[];
  calendarDim: DimCalendarRow[];
  isLoading: boolean;
  session: UserSession;
  addMember: (name: string, role?: Role) => Promise<void>;
  assignGuard: (guard: Omit<GuardAssignmentUI, "id">) => Promise<void>;
  removeGuard: (id: string) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  createTimeOffRequest: (request: Omit<TimeOffRequestUI, "id" | "status" | "createdAt">) => Promise<void>;
  updateTimeOffRequestStatus: (id: string, status: TimeOffStatus) => Promise<void>;
  deleteTimeOffRequest: (id: string) => Promise<void>;
  logout: () => Promise<void>;
}

const GuardContext = createContext<GuardContextType | undefined>(undefined);

export function GuardProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [guards, setGuards] = useState<GuardAssignmentUI[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequestUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<UserSession>({ user: null, role: 'user', memberId: null });
  const [calendarDim, setCalendarDim] = useState<DimCalendarRow[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  const fetchCalendarDim = async () => {
    const { data, error } = await supabase.from('dim_calendario').select('*').eq('year', new Date().getFullYear());
    if (error) {
      console.error("Error fetching dim_calendario:", error);
      return [];
    }
    return data as DimCalendarRow[];
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase.from('members').select('*');
    if (error) {
      console.error("Error fetching members:", error);
      return [];
    }
    return data as Member[];
  };

  const fetchGuards = async () => {
    const { data, error } = await supabase.from('guards').select('*');
    if (error) {
      console.error("Error fetching guards:", error);
      return [];
    }

    // Map to UI representation
    return (data as GuardAssignment[]).map(g => ({
      id: g.id,
      memberId: g.member_id,
      type: g.type,
      startDate: parseISO(g.start_date),
      endDate: parseISO(g.end_date)
    }));
  };

  const fetchTimeOffRequests = async () => {
    const { data, error } = await supabase.from('time_off_requests').select('*');
    if (error) {
      if (error.code === '42P01') {
         // table doesn't exist yet
         return [];
      }
      console.error("Error fetching time off requests:", error);
      return [];
    }

    return (data as TimeOffRequestDB[]).map(r => ({
      id: r.id,
      memberId: r.member_id,
      type: r.type,
      startDate: parseISO(r.start_date),
      endDate: parseISO(r.end_date),
      reason: r.reason,
      status: r.status,
      createdAt: parseISO(r.created_at)
    }));
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    const [membersData, guardsData, calendarData, requestsData] = await Promise.all([
      fetchMembers(),
      fetchGuards(),
      fetchCalendarDim(),
      fetchTimeOffRequests()
    ]);

    setCalendarDim(calendarData);
    setTimeOffRequests(requestsData);

    if (membersData.length === 0) {
      // Initialize default members if empty (for example purposes or initial load)
      const defaultMembers = [
        { name: "Cristian Rojas", role: 'admin' },
        { name: "Agostina Zorzon", role: 'user' },
        { name: "Federico Cusa", role: 'user' },
        { name: "Elias Gomez", role: 'user' }
      ];

      const { data: newMembers, error } = await supabase
        .from('members')
        .insert(defaultMembers)
        .select();

      if (!error && newMembers) {
        setMembers(newMembers as Member[]);
      } else {
         console.error("Failed to init default members", error);
      }
    } else {
      setMembers(membersData);
    }

    setGuards(guardsData);
    setIsLoading(false);
  };

  useEffect(() => {
    const handleSessionUpdate = async (currentSession: any) => {
      if (currentSession?.user) {
        // Find role in members table based on email
        const { data } = await supabase
          .from('members')
          .select('id, role')
          .eq('email', currentSession.user.email)
          .single();

        setSession({
          user: currentSession.user,
          role: (data?.role as Role) || 'user',
          memberId: data?.id || null
        });
        loadInitialData(); // Load data once authenticated
      } else {
        setSession({ user: null, role: 'user', memberId: null });
      }
      setAuthLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      handleSessionUpdate(currentSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
      handleSessionUpdate(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const addMember = async (name: string, role: Role = 'user') => {
    if (session.role !== 'admin') return alert("Permiso denegado");
    const { data, error } = await supabase
      .from('members')
      .insert([{ name, role }])
      .select();

    if (error) {
      console.error("Error adding member", error);
      return;
    }

    if (data && data.length > 0) {
      setMembers((prev) => [...prev, data[0] as Member]);
    }
  };

  const assignGuard = async (guardUI: Omit<GuardAssignmentUI, "id">) => {
    if (session.role !== 'admin') return alert("Permiso denegado");
    const newGuard = {
      member_id: guardUI.memberId,
      type: guardUI.type,
      start_date: format(guardUI.startDate, 'yyyy-MM-dd'),
      end_date: format(guardUI.endDate, 'yyyy-MM-dd')
    };

    const { data, error } = await supabase
      .from('guards')
      .insert([newGuard])
      .select();

    if (error) {
      console.error("Error adding guard", error);
      return;
    }

    if (data && data.length > 0) {
      const g = data[0] as GuardAssignment;
      const addedGuard: GuardAssignmentUI = {
        id: g.id,
        memberId: g.member_id,
        type: g.type,
        startDate: parseISO(g.start_date),
        endDate: parseISO(g.end_date)
      };
      setGuards((prev) => [...prev, addedGuard]);
    }
  };

  const removeGuard = async (id: string) => {
    if (session.role !== 'admin') return alert("Permiso denegado");
    const { error } = await supabase
      .from('guards')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting guard", error);
      return;
    }

    setGuards((prev) => prev.filter(g => g.id !== id));
  };

  const removeMember = async (id: string) => {
    if (session.role !== 'admin') return alert("Permiso denegado");
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting member", error);
      return;
    }

    setMembers((prev) => prev.filter(m => m.id !== id));
    setGuards((prev) => prev.filter(g => g.memberId !== id));
  };

  const createTimeOffRequest = async (requestUI: Omit<TimeOffRequestUI, "id" | "status" | "createdAt">) => {
    const newRequest = {
      member_id: requestUI.memberId,
      type: requestUI.type,
      start_date: format(requestUI.startDate, 'yyyy-MM-dd'),
      end_date: format(requestUI.endDate, 'yyyy-MM-dd'),
      reason: requestUI.reason,
      status: 'pending' as TimeOffStatus
    };

    const { data, error } = await supabase
      .from('time_off_requests')
      .insert([newRequest])
      .select();

    if (error) {
      console.error("Error creating time off request:", error);
      return;
    }

    if (data && data.length > 0) {
      const r = data[0] as TimeOffRequestDB;
      const addedRequest: TimeOffRequestUI = {
        id: r.id,
        memberId: r.member_id,
        type: r.type,
        startDate: parseISO(r.start_date),
        endDate: parseISO(r.end_date),
        reason: r.reason,
        status: r.status,
        createdAt: parseISO(r.created_at)
      };
      setTimeOffRequests((prev) => [...prev, addedRequest]);
    }
  };

  const updateTimeOffRequestStatus = async (id: string, status: TimeOffStatus) => {
    if (session.role !== 'admin') return alert("Permiso denegado");
    const { error } = await supabase
      .from('time_off_requests')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error("Error updating time off request status:", error);
      return;
    }

    setTimeOffRequests((prev) => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const deleteTimeOffRequest = async (id: string) => {
    if (session.role !== 'admin') return alert("Permiso denegado");

    try {
      const { error } = await supabase
        .from('time_off_requests')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting time off request:", error);
        throw error;
      }

      setTimeOffRequests((prev) => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error("Failed to delete time off request", e);
      alert("Hubo un problema al intentar eliminar la solicitud.");
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!session.user) {
    return <LoginView recoveryMode={recoveryMode} setRecoveryMode={setRecoveryMode} />;
  }

  return (
    <GuardContext.Provider value={{
       members, guards, timeOffRequests, calendarDim, isLoading, session,
       addMember, assignGuard, removeGuard, removeMember,
       createTimeOffRequest, updateTimeOffRequestStatus, deleteTimeOffRequest, logout
    }}>
      {children}
    </GuardContext.Provider>
  );
}

export function useGuardContext() {
  const context = useContext(GuardContext);
  if (!context) {
    throw new Error("useGuardContext must be used within a GuardProvider");
  }
  return context;
}

export { GuardContext };
