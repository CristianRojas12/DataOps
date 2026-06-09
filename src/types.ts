export type GuardType = "Guardia Matutina" | "Guardia Vespertina";

export interface Member {
  id: string;
  name: string;
}

export interface GuardAssignment {
  id: string;
  memberId: string;
  type: GuardType;
  startDate: Date;
  endDate: Date;
}
