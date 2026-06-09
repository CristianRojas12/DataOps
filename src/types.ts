export type GuardType = "Guardia Matutina" | "Guardia Vespertina";

export interface Member {
  id: string;
  name: string;
}

export interface GuardAssignment {
  id: string;
  member_id: string;
  type: GuardType;
  start_date: string;
  end_date: string;
}

// For frontend components that still use camelCase and Date objects
export interface GuardAssignmentUI {
  id: string;
  memberId: string;
  type: GuardType;
  startDate: Date;
  endDate: Date;
}
