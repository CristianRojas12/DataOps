import { createContext, useContext, useState } from "react";
import type { Member, GuardAssignment } from "./types";

interface GuardContextType {
  members: Member[];
  guards: GuardAssignment[];
  addMember: (name: string) => void;
  assignGuard: (guard: Omit<GuardAssignment, "id">) => void;
}

const GuardContext = createContext<GuardContextType | undefined>(undefined);

export function GuardProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = useState<Member[]>([
    { id: "1", name: "Cristian Rojas" },
    { id: "2", name: "Agostina Zorzon" },
    { id: "3", name: "Federico Cusa" },
  ]);
  const [guards, setGuards] = useState<GuardAssignment[]>([]);

  const addMember = (name: string) => {
    setMembers((prev) => [...prev, { id: Math.random().toString(), name }]);
  };

  const assignGuard = (guard: Omit<GuardAssignment, "id">) => {
    setGuards((prev) => [...prev, { ...guard, id: Math.random().toString() }]);
  };

  return (
    <GuardContext.Provider value={{ members, guards, addMember, assignGuard }}>
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
