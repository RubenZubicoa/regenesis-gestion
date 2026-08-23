import type { ClientDetail } from '../models/client-detail';
import type { DailySteps } from '../models/daily-steps';
import type { Macros } from '../models/macros';
import type { Meal } from '../models/meal';
import type { Measurement } from '../models/measurement';
import type { ProgressImage } from '../models/progress-image';
import type { RoutineDay } from '../models/routine-day';
import type { Supplements } from '../models/supplements';
import type { Wellness } from '../models/wellness';
import type { WorkoutHistory } from '../models/workout-history';
import { MOCK_CLIENTS } from './mock-clients';
import { MOCK_PROGRAMS } from './mock-programs';
import { MOCK_REVIEWS } from './mock-reviews';
import { MOCK_WEIGHTS } from './mock-weights';

const RUBEN_ID = '6a620e6c10d4cdecdb7c6817';

const MOCK_MACROS: Record<string, Macros> = {
  [RUBEN_ID]: {
    _id: 'macros-ruben',
    clientId: RUBEN_ID,
    calories: 1840,
    target: 2100,
    items: [
      { key: 'protein', label: 'Proteína', shortLabel: 'P', grams: 145, target: 160, tone: 'gold' },
      { key: 'carbs', label: 'Carbohidratos', shortLabel: 'C', grams: 180, target: 220, tone: 'teal' },
      { key: 'fat', label: 'Grasas', shortLabel: 'G', grams: 52, target: 65, tone: 'coral' },
    ],
  },
};

const MOCK_MEALS: Record<string, Meal> = {
  [RUBEN_ID]: {
    _id: 'meal-ruben',
    clientId: RUBEN_ID,
    slots: [
      {
        label: 'Desayuno',
        time: '08:00',
        icon: 'sunny-outline',
        options: [
          { name: 'Avena con claras y plátano', kcal: 420, description: '40g avena · 3 claras · 1 plátano' },
          { name: 'Tostadas integrales con huevo', kcal: 390, description: '2 rebanadas · 2 huevos · aguacate' },
        ],
      },
      {
        label: 'Media mañana',
        time: '11:00',
        icon: 'cafe-outline',
        options: [{ name: 'Yogur griego + frutos rojos', kcal: 180 }],
      },
      {
        label: 'Comida',
        time: '14:00',
        icon: 'restaurant-outline',
        options: [
          { name: 'Pollo con arroz y verduras', kcal: 580, description: '150g pollo · 80g arroz · mix verduras' },
          { name: 'Salmon con patata y ensalada', kcal: 610 },
        ],
      },
      {
        label: 'Merienda',
        time: '17:30',
        icon: 'nutrition-outline',
        options: [{ name: 'Batido de proteína + avena', kcal: 220 }],
      },
      {
        label: 'Cena',
        time: '21:00',
        icon: 'moon-outline',
        options: [
          { name: 'Tortilla de claras con ensalada', kcal: 320 },
          { name: 'Pavo con quinoa y calabacín', kcal: 450 },
        ],
      },
    ],
  },
};

const MOCK_SUPPLEMENTS: Record<string, Supplements> = {
  [RUBEN_ID]: {
    _id: 'sup-ruben',
    clientId: RUBEN_ID,
    elements: [
      { name: 'Creatina', dose: '5 g', when: 'Post-entreno', icon: 'flash-outline' },
      { name: 'Omega-3', dose: '2 cáps', when: 'Con comida', icon: 'water-outline' },
      { name: 'Vitamina D', dose: '2000 UI', when: 'Desayuno', icon: 'sunny-outline' },
      { name: 'Magnesio', dose: '400 mg', when: 'Antes de dormir', icon: 'moon-outline' },
    ],
  },
};

const MOCK_ROUTINE: Record<string, RoutineDay[]> = {
  [RUBEN_ID]: [
    {
      _id: 'rd-1',
      clientId: RUBEN_ID,
      day: 'Lunes',
      focus: 'Pecho + Tríceps',
      done: true,
      duration: '55 min',
      exercises: [
        { exerciseId: 'ex-1', name: 'Press banca', sets: '4 x 8-10', rest: '90s', seriesCount: 4 },
        { exerciseId: 'ex-2', name: 'Press inclinado mancuernas', sets: '3 x 10-12', rest: '75s', seriesCount: 3 },
        { exerciseId: 'ex-3', name: 'Fondos en paralelas', sets: '3 x 12', rest: '60s', seriesCount: 3 },
        { exerciseId: 'ex-4', name: 'Extensión de tríceps polea', sets: '3 x 12-15', rest: '45s', seriesCount: 3 },
      ],
    },
    {
      _id: 'rd-2',
      clientId: RUBEN_ID,
      day: 'Martes',
      focus: 'Cardio LISS',
      done: true,
      duration: '35 min',
      exercises: [
        { exerciseId: 'ex-5', name: 'Cinta inclinada', sets: '35 min', rest: '—', seriesCount: 1 },
      ],
    },
    {
      _id: 'rd-3',
      clientId: RUBEN_ID,
      day: 'Miércoles',
      focus: 'Espalda + Bíceps',
      done: false,
      duration: '60 min',
      exercises: [
        { exerciseId: 'ex-6', name: 'Dominadas', sets: '4 x 6-8', rest: '120s', seriesCount: 4 },
        { exerciseId: 'ex-7', name: 'Remo con barra', sets: '4 x 8-10', rest: '90s', seriesCount: 4 },
        { exerciseId: 'ex-8', name: 'Curl bíceps barra', sets: '3 x 10-12', rest: '60s', seriesCount: 3 },
      ],
    },
    {
      _id: 'rd-4',
      clientId: RUBEN_ID,
      day: 'Jueves',
      focus: 'Descanso activo',
      done: false,
      duration: '20 min',
      exercises: [
        { exerciseId: 'ex-9', name: 'Movilidad articular', sets: '20 min', rest: '—', seriesCount: 1 },
      ],
    },
    {
      _id: 'rd-5',
      clientId: RUBEN_ID,
      day: 'Viernes',
      focus: 'Pierna',
      done: false,
      duration: '65 min',
      exercises: [
        { exerciseId: 'ex-10', name: 'Sentadilla', sets: '4 x 6-8', rest: '120s', seriesCount: 4 },
        { exerciseId: 'ex-11', name: 'Prensa 45°', sets: '3 x 10-12', rest: '90s', seriesCount: 3 },
        { exerciseId: 'ex-12', name: 'Curl femoral', sets: '3 x 12', rest: '60s', seriesCount: 3 },
      ],
    },
  ],
};

const MOCK_WORKOUTS: Record<string, WorkoutHistory[]> = {
  [RUBEN_ID]: [
    {
      _id: 'wh-1',
      clientId: RUBEN_ID,
      week: 7,
      date: '2026-08-18',
      day: 'Lunes',
      focus: 'Pecho + Tríceps',
      duration: '52 min',
      durationMinutes: 52,
      exercises: [
        {
          name: 'Press banca',
          type: 'strength',
          strengthSets: [
            { set: 1, weightKg: 70, reps: 10 },
            { set: 2, weightKg: 72.5, reps: 9 },
            { set: 3, weightKg: 72.5, reps: 8 },
            { set: 4, weightKg: 70, reps: 9 },
          ],
        },
        {
          name: 'Press inclinado mancuernas',
          type: 'strength',
          strengthSets: [
            { set: 1, weightKg: 26, reps: 12 },
            { set: 2, weightKg: 28, reps: 10 },
            { set: 3, weightKg: 28, reps: 10 },
          ],
        },
      ],
    },
    {
      _id: 'wh-2',
      clientId: RUBEN_ID,
      week: 7,
      date: '2026-08-19',
      day: 'Martes',
      focus: 'Cardio LISS',
      duration: '35 min',
      durationMinutes: 35,
      exercises: [
        {
          name: 'Cinta inclinada',
          type: 'cardio',
          cardio: { km: 4.2, speedKmh: 7.2, avgHr: 132 },
        },
      ],
    },
  ],
};

const MOCK_MEASUREMENTS: Record<string, Measurement[]> = {
  [RUBEN_ID]: [
    { _id: 'm-1', client: RUBEN_ID, MeasurementId: 'mm-cintura', label: 'Cintura', unit: 'cm', value: 74, delta: -6, date: '2026-08-10' },
    { _id: 'm-2', client: RUBEN_ID, MeasurementId: 'mm-cadera', label: 'Cadera', unit: 'cm', value: 96, delta: -3, date: '2026-08-10' },
    { _id: 'm-3', client: RUBEN_ID, MeasurementId: 'mm-pecho', label: 'Pecho', unit: 'cm', value: 90, delta: -2, date: '2026-08-10' },
    { _id: 'm-4', client: RUBEN_ID, MeasurementId: 'mm-brazo', label: 'Brazo', unit: 'cm', value: 29, delta: 1, date: '2026-08-10' },
  ],
};

const MOCK_WELLNESS: Record<string, Wellness[]> = {
  [RUBEN_ID]: [
    { _id: 'w-1', clientId: RUBEN_ID, wellnessId: 'wm-energia', label: 'Energía', icon: 'flash-outline', tone: 'gold', value: 78, date: '2026-08-20' },
    { _id: 'w-2', clientId: RUBEN_ID, wellnessId: 'wm-sueno', label: 'Sueño', icon: 'moon-outline', tone: 'purple', value: 72, date: '2026-08-20' },
    { _id: 'w-3', clientId: RUBEN_ID, wellnessId: 'wm-estres', label: 'Estrés', icon: 'pulse-outline', tone: 'coral', value: 35, date: '2026-08-20' },
    { _id: 'w-4', clientId: RUBEN_ID, wellnessId: 'wm-hambre', label: 'Hambre', icon: 'nutrition-outline', tone: 'teal', value: 55, date: '2026-08-20' },
  ],
};

const MOCK_STEPS: Record<string, DailySteps> = {
  [RUBEN_ID]: {
    _id: 'ds-ruben',
    clientId: RUBEN_ID,
    goal: 10000,
    days: [
      { date: '2026-08-14', steps: 8420 },
      { date: '2026-08-15', steps: 10250 },
      { date: '2026-08-16', steps: 6800 },
      { date: '2026-08-17', steps: 11500 },
      { date: '2026-08-18', steps: 9200 },
      { date: '2026-08-19', steps: 10800 },
      { date: '2026-08-20', steps: 7600 },
    ],
  },
};

const MOCK_IMAGES: Record<string, ProgressImage[]> = {
  [RUBEN_ID]: [
    {
      _id: 'pi-1',
      clientId: RUBEN_ID,
      image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=500&fit=crop',
      createdAt: '2026-06-15T10:00:00Z',
      updatedAt: '2026-06-15T10:00:00Z',
    },
    {
      _id: 'pi-2',
      clientId: RUBEN_ID,
      image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=500&fit=crop',
      createdAt: '2026-07-20T10:00:00Z',
      updatedAt: '2026-07-20T10:00:00Z',
    },
    {
      _id: 'pi-3',
      clientId: RUBEN_ID,
      image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=500&fit=crop',
      createdAt: '2026-08-10T10:00:00Z',
      updatedAt: '2026-08-10T10:00:00Z',
    },
  ],
};

function fallbackMacros(clientId: string): Macros {
  return {
    _id: `macros-${clientId}`,
    clientId,
    calories: 1700,
    target: 2000,
    items: [
      { key: 'protein', label: 'Proteína', shortLabel: 'P', grams: 120, target: 150, tone: 'gold' },
      { key: 'carbs', label: 'Carbohidratos', shortLabel: 'C', grams: 160, target: 200, tone: 'teal' },
      { key: 'fat', label: 'Grasas', shortLabel: 'G', grams: 48, target: 60, tone: 'coral' },
    ],
  };
}

function fallbackMeal(clientId: string): Meal {
  return {
    _id: `meal-${clientId}`,
    clientId,
    slots: [
      { label: 'Desayuno', time: '08:00', icon: 'sunny-outline', options: [{ name: 'Desayuno equilibrado', kcal: 400 }] },
      { label: 'Comida', time: '14:00', icon: 'restaurant-outline', options: [{ name: 'Comida principal', kcal: 550 }] },
      { label: 'Cena', time: '21:00', icon: 'moon-outline', options: [{ name: 'Cena ligera', kcal: 380 }] },
    ],
  };
}

function fallbackRoutine(clientId: string): RoutineDay[] {
  return [
    {
      _id: `rd-a-${clientId}`,
      clientId,
      day: 'Lunes',
      focus: 'Full body A',
      done: false,
      duration: '50 min',
      exercises: [
        { exerciseId: 'ex-a', name: 'Sentadilla', sets: '4 x 8', rest: '90s', seriesCount: 4 },
        { exerciseId: 'ex-b', name: 'Press banca', sets: '3 x 10', rest: '75s', seriesCount: 3 },
      ],
    },
    {
      _id: `rd-b-${clientId}`,
      clientId,
      day: 'Miércoles',
      focus: 'Full body B',
      done: false,
      duration: '50 min',
      exercises: [
        { exerciseId: 'ex-c', name: 'Peso muerto', sets: '4 x 6', rest: '120s', seriesCount: 4 },
        { exerciseId: 'ex-d', name: 'Remo', sets: '3 x 10', rest: '75s', seriesCount: 3 },
      ],
    },
  ];
}

export function getClientDetail(clientId: string): ClientDetail | null {
  const client = MOCK_CLIENTS.find((c) => c._id === clientId);
  if (!client) return null;

  const program = MOCK_PROGRAMS.find((p) => p._id === client.program);
  const reviews = MOCK_REVIEWS.filter((r) => r.clientId === clientId);
  const upcomingReview = reviews.find((r) => r.status === 'upcoming') ?? null;
  const weight = MOCK_WEIGHTS.find((w) => w.clientId === clientId) ?? null;

  return {
    client,
    programName: program?.name ?? 'Sin programa',
    reviews,
    upcomingReview,
    weight,
    macros: MOCK_MACROS[clientId] ?? fallbackMacros(clientId),
    meal: MOCK_MEALS[clientId] ?? fallbackMeal(clientId),
    supplements: MOCK_SUPPLEMENTS[clientId] ?? { _id: `sup-${clientId}`, clientId, elements: [] },
    routineDays: MOCK_ROUTINE[clientId] ?? fallbackRoutine(clientId),
    workoutHistory: MOCK_WORKOUTS[clientId] ?? [],
    measurements: MOCK_MEASUREMENTS[clientId] ?? [],
    wellness: MOCK_WELLNESS[clientId] ?? [],
    dailySteps: MOCK_STEPS[clientId] ?? null,
    progressImages: MOCK_IMAGES[clientId] ?? [],
  };
}
