/** Alineado con ClientPublic del API (sin contraseña). */
export interface Client {
  _id: string;
  name: string;
  fullName: string;
  email: string;
  telefono: string;
  goal: string;
  coach: string;
  plan: string;
  /** Id del documento Program. */
  program: string;
  startDate: string;
  endDate: string;
  week: number;
  totalWeeks: number;
  phase: number;
  totalPhases: number;
  avatar: string;
}
