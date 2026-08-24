export interface DaySteps {
  label: string;
  value: number;
}

export interface DailySteps {
  _id: string;
  clientId: string;
  week: number;
  goal: number;
  days: DaySteps[];
}
