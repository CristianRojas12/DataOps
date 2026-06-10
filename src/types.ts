export type GuardType = "Guardia Matutina" | "Guardia Vespertina";

export type Role = "admin" | "user";

export interface Member {
  id: string;
  name: string;
  email?: string;
  role: Role;
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

export interface UserSession {
  user: any | null; // Supabase User
  role: Role;
}

export interface DimCalendarRow {
  date_key: string;
  year: number;
  month: number;
  day: number;
  day_of_week: number;
  is_weekend: boolean;
  is_holiday: boolean;
  holiday_name: string | null;
}
