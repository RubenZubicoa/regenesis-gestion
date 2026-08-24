import type { Client } from '../models/client';
import type { DailySteps, DaySteps } from '../models/daily-steps';
import type { Macros } from '../models/macros';
import type { Meal } from '../models/meal';
import type { Measurement } from '../models/measurement';
import type { ProgressImage } from '../models/progress-image';
import type { Program } from '../models/program';
import type { Review, ReviewStatus } from '../models/review';
import type { RoutineDay } from '../models/routine-day';
import type { Supplements } from '../models/supplements';
import type { Weight } from '../models/weight';
import type { Wellness } from '../models/wellness';
import type { WorkoutHistory } from '../models/workout-history';

type ApiRecord = Record<string, unknown>;

function asApiRecord(raw: unknown): ApiRecord {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as ApiRecord) : {};
}

function str(raw: ApiRecord, key: string, fallback = ''): string {
  return String(raw[key] ?? fallback);
}

function num(raw: ApiRecord, key: string, fallback = 0): number {
  return Number(raw[key] ?? fallback);
}

export function normalizeId(id: unknown): string {
  if (typeof id === 'string') return id;
  if (id && typeof id === 'object' && '$oid' in id) {
    return String((id as { $oid: string }).$oid);
  }
  return String(id ?? '');
}

function normalizeDate(value: unknown): string {
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value && typeof value === 'object' && '$date' in value) {
    return String((value as { $date: string }).$date).slice(0, 10);
  }
  return String(value ?? '');
}

export function normalizeClient(raw: unknown): Client {
  const r = asApiRecord(raw);
  return {
    _id: normalizeId(r['_id']),
    name: str(r, 'name'),
    fullName: str(r, 'fullName'),
    email: str(r, 'email'),
    telefono: str(r, 'telefono'),
    goal: str(r, 'goal'),
    coach: str(r, 'coach'),
    plan: str(r, 'plan'),
    program: normalizeId(r['program']),
    startDate: normalizeDate(r['startDate']),
    endDate: normalizeDate(r['endDate']),
    week: num(r, 'week', 1),
    totalWeeks: num(r, 'totalWeeks', 12),
    phase: num(r, 'phase', 1),
    totalPhases: num(r, 'totalPhases', 3),
    avatar: str(r, 'avatar'),
  };
}

export function normalizeProgram(raw: unknown): Program {
  const r = asApiRecord(raw);
  return {
    _id: normalizeId(r['_id']),
    name: str(r, 'name'),
    description: str(r, 'description'),
  };
}

export function normalizeReview(raw: unknown): Review {
  const r = asApiRecord(raw);
  return {
    _id: normalizeId(r['_id']),
    clientId: normalizeId(r['clientId']),
    title: str(r, 'title'),
    date: str(r, 'date'),
    status: str(r, 'status', 'upcoming') as ReviewStatus,
    note: str(r, 'note'),
  };
}

export function normalizeWeight(raw: unknown): Weight {
  const r = asApiRecord(raw);
  const labelsRaw = Array.isArray(r['labels']) ? r['labels'] : [];
  const dataRaw = Array.isArray(r['data']) ? r['data'] : [];
  return {
    _id: normalizeId(r['_id']),
    clientId: normalizeId(r['clientId']),
    labels: labelsRaw.map(String),
    data: dataRaw.map(Number),
    start: num(r, 'start'),
    current: num(r, 'current'),
    target: num(r, 'target'),
    unit: str(r, 'unit', 'kg'),
  };
}

export function normalizeMacros(raw: unknown): Macros {
  const r = asApiRecord(raw);
  const itemsRaw = Array.isArray(r['items']) ? r['items'] : [];
  return {
    _id: normalizeId(r['_id']),
    clientId: normalizeId(r['clientId']),
    calories: num(r, 'calories'),
    target: num(r, 'target'),
    items: itemsRaw.map((entry) => {
      const item = asApiRecord(entry);
      return {
        key: str(item, 'key'),
        label: str(item, 'label'),
        shortLabel: str(item, 'shortLabel'),
        grams: num(item, 'grams'),
        target: num(item, 'target'),
        tone: str(item, 'tone', 'gold'),
      };
    }),
  };
}

export function normalizeMeal(raw: unknown): Meal {
  const r = asApiRecord(raw);
  const slotsRaw = Array.isArray(r['slots']) ? r['slots'] : [];
  return {
    _id: normalizeId(r['_id']),
    clientId: normalizeId(r['clientId']),
    slots: slotsRaw.map((entry) => {
      const slot = asApiRecord(entry);
      const optionsRaw = Array.isArray(slot['options']) ? slot['options'] : [];
      return {
        label: str(slot, 'label'),
        time: str(slot, 'time'),
        icon: str(slot, 'icon'),
        options: optionsRaw.map((opt) => {
          const option = asApiRecord(opt);
          return {
            name: str(option, 'name'),
            kcal: num(option, 'kcal'),
            description: option['description'] ? str(option, 'description') : undefined,
          };
        }),
      };
    }),
  };
}

export function normalizeSupplements(raw: unknown): Supplements {
  const r = asApiRecord(raw);
  const elementsRaw = Array.isArray(r['elements']) ? r['elements'] : [];
  return {
    _id: normalizeId(r['_id']),
    clientId: normalizeId(r['clientId']),
    elements: elementsRaw.map((entry) => {
      const el = asApiRecord(entry);
      return {
        name: str(el, 'name'),
        dose: str(el, 'dose'),
        when: str(el, 'when'),
        icon: str(el, 'icon'),
        ...(str(el, 'purchaseLink')
          ? { purchaseLink: str(el, 'purchaseLink') }
          : {}),
      };
    }),
  };
}

export function normalizeRoutineDay(raw: unknown): RoutineDay {
  const r = asApiRecord(raw);
  const exercisesRaw = Array.isArray(r['exercises']) ? r['exercises'] : [];
  return {
    _id: normalizeId(r['_id']),
    clientId: normalizeId(r['clientId']),
    day: str(r, 'day'),
    focus: str(r, 'focus'),
    done: Boolean(r['done']),
    duration: str(r, 'duration'),
    exercises: exercisesRaw.map((entry) => {
      const ex = asApiRecord(entry);
      const typeRaw = str(ex, 'type', 'strength');
      const repRangeRaw =
        ex['repRange'] && typeof ex['repRange'] === 'object'
          ? asApiRecord(ex['repRange'])
          : null;
      return {
        exerciseId: normalizeId(ex['exerciseId']),
        name: str(ex, 'name', 'Ejercicio'),
        type: typeRaw === 'cardio' ? 'cardio' : 'strength',
        image: ex['imageUrl'] ? str(ex, 'imageUrl') : undefined,
        sets: str(ex, 'sets'),
        rest: str(ex, 'rest'),
        seriesCount: ex['seriesCount'] != null ? num(ex, 'seriesCount') : undefined,
        ...(repRangeRaw
          ? {
              repRange: {
                min: num(repRangeRaw, 'min'),
                max: num(repRangeRaw, 'max'),
              },
            }
          : {}),
        ...(ex['repUnit'] === 'reps' || ex['repUnit'] === 's'
          ? { repUnit: ex['repUnit'] as 'reps' | 's' }
          : {}),
        ...(ex['targetKm'] != null ? { targetKm: num(ex, 'targetKm') } : {}),
      };
    }),
  };
}

export function normalizeWorkoutHistory(raw: unknown): WorkoutHistory {
  const r = asApiRecord(raw);
  const exercisesRaw = Array.isArray(r['exercises']) ? r['exercises'] : [];
  return {
    _id: normalizeId(r['_id']),
    clientId: normalizeId(r['clientId']),
    week: num(r, 'week'),
    date: normalizeDate(r['date']),
    day: str(r, 'day'),
    focus: str(r, 'focus'),
    duration: str(r, 'duration'),
    durationMinutes: num(r, 'durationMinutes'),
    exercises: exercisesRaw.map((entry) => {
      const ex = asApiRecord(entry);
      const strengthSetsRaw = Array.isArray(ex['strengthSets']) ? ex['strengthSets'] : undefined;
      const cardioRaw =
        ex['cardio'] && typeof ex['cardio'] === 'object'
          ? asApiRecord(ex['cardio'])
          : undefined;
      return {
        name: str(ex, 'name'),
        type: str(ex, 'type', 'strength') as 'strength' | 'cardio',
        strengthSets: strengthSetsRaw?.map((set) => {
          const s = asApiRecord(set);
          return {
            set: num(s, 'set'),
            weightKg: num(s, 'weightKg'),
            reps: num(s, 'reps'),
          };
        }),
        cardio: cardioRaw
          ? {
              km: num(cardioRaw, 'km'),
              speedKmh: num(cardioRaw, 'speedKmh'),
              avgHr: num(cardioRaw, 'avgHr'),
            }
          : undefined,
      };
    }),
  };
}

export function normalizeMeasurement(
  raw: unknown,
): Omit<Measurement, 'label' | 'unit'> {
  const r = asApiRecord(raw);
  return {
    _id: normalizeId(r['_id']),
    client: normalizeId(r['client']),
    MeasurementId: normalizeId(r['MeasurementId']),
    value: num(r, 'value'),
    delta: num(r, 'delta'),
    date: normalizeDate(r['date']),
  };
}

export function normalizeWellness(
  raw: unknown,
): Omit<Wellness, 'label' | 'icon' | 'tone'> {
  const r = asApiRecord(raw);
  return {
    _id: normalizeId(r['_id']),
    clientId: normalizeId(r['clientId']),
    wellnessId: normalizeId(r['wellnessId']),
    value: num(r, 'value'),
    date: normalizeDate(r['date']),
  };
}

export function normalizeDailySteps(raw: unknown): DailySteps {
  const r = asApiRecord(raw);
  const daysRaw = Array.isArray(r['days']) ? r['days'] : [];
  const days: DaySteps[] = daysRaw.map((entry) => {
    const day = asApiRecord(entry);
    return {
      label: str(day, 'label'),
      value: num(day, 'value'),
    };
  });
  return {
    _id: normalizeId(r['_id']),
    clientId: normalizeId(r['clientId']),
    week: num(r, 'week'),
    goal: num(r, 'goal'),
    days,
  };
}

export function normalizeProgressImage(raw: unknown): ProgressImage {
  const r = asApiRecord(raw);
  return {
    _id: normalizeId(r['_id']),
    clientId: normalizeId(r['clientId']),
    image: str(r, 'image'),
    createdAt: str(r, 'createdAt') || str(r, 'updatedAt'),
    updatedAt: str(r, 'updatedAt') || str(r, 'createdAt'),
  };
}

export interface MeasurementMaster {
  _id: string;
  key: string;
  label: string;
  unit: string;
  icon: string;
}

export interface WellnessMaster {
  _id: string;
  key: string;
  label: string;
  icon: string;
  tone: string;
}

export function normalizeMeasurementMaster(raw: unknown): MeasurementMaster {
  const r = asApiRecord(raw);
  return {
    _id: normalizeId(r['_id']),
    key: str(r, 'key'),
    label: str(r, 'label'),
    unit: str(r, 'unit'),
    icon: str(r, 'icon'),
  };
}

export function normalizeWellnessMaster(raw: unknown): WellnessMaster {
  const r = asApiRecord(raw);
  return {
    _id: normalizeId(r['_id']),
    key: str(r, 'key'),
    label: str(r, 'label'),
    icon: str(r, 'icon'),
    tone: str(r, 'tone', 'gold'),
  };
}

export function enrichMeasurement(
  record: Omit<Measurement, 'label' | 'unit'>,
  masters: MeasurementMaster[],
): Measurement {
  const master = masters.find((m) => m._id === record.MeasurementId);
  return {
    ...record,
    label: master?.label ?? record.MeasurementId,
    unit: master?.unit ?? '',
  };
}

export function enrichWellness(
  record: Omit<Wellness, 'label' | 'icon' | 'tone'>,
  masters: WellnessMaster[],
): Wellness {
  const master =
    masters.find((m) => m._id === record.wellnessId) ??
    masters.find((m) => m.key === record.wellnessId);
  return {
    ...record,
    label: master?.label ?? 'Sensación',
    icon: master?.icon ?? '',
    tone: master?.tone ?? 'gold',
  };
}

export function latestMeasurements(records: Measurement[]): Measurement[] {
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const seen = new Set<string>();
  const latest: Measurement[] = [];
  for (const record of sorted) {
    if (seen.has(record.MeasurementId)) continue;
    seen.add(record.MeasurementId);
    latest.push(record);
  }
  return latest;
}

export function latestWellness(records: Wellness[]): Wellness[] {
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const seen = new Set<string>();
  const latest: Wellness[] = [];
  for (const record of sorted) {
    if (seen.has(record.wellnessId)) continue;
    seen.add(record.wellnessId);
    latest.push(record);
  }
  return latest;
}

export function pickCurrentDailySteps(
  records: DailySteps[],
  week?: number,
): DailySteps | null {
  if (records.length === 0) return null;
  if (week != null) {
    const match = records.find((r) => r.week === week);
    if (match) return match;
  }
  return [...records].sort((a, b) => b.week - a.week)[0] ?? null;
}

export function asRecordArray(raw: unknown): ApiRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => asApiRecord(item));
}
