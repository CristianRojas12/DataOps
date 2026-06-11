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
  memberId: string | null;
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

export type TimeOffType = 'vacaciones' | 'dia_guardia';
export type TimeOffStatus = 'pending' | 'approved' | 'rejected';

export interface TimeOffRequestDB {
  id: string;
  member_id: string;
  type: TimeOffType;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: TimeOffStatus;
  created_at: string;
}

export interface TimeOffRequestUI {
  id: string;
  memberId: string;
  type: TimeOffType;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  status: TimeOffStatus;
  createdAt: Date;
}
