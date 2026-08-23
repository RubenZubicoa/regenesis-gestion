export interface DaySteps {
  date: string;
  steps: number;
}

export interface DailySteps {
  _id: string;
  clientId: string;
  goal: number;
  days: DaySteps[];
}
