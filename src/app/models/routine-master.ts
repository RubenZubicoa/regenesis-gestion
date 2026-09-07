import { RoutineDay } from "./routine-day";

export type RoutineMaster = Omit<RoutineDay, "clientId">;