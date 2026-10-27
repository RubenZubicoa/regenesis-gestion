import { normalizeId } from '../core/normalizers';
import {
  normalizeStepsRankingEntry,
  type StepsRankingEntry,
} from './steps-ranking';

export type SocialFeedKind =
  | 'workout'
  | 'weight'
  | 'measurement'
  | 'steps'
  | 'wellness'
  | 'photos'
  | 'challenge';

export type SocialFeedKindTone = 'blue' | 'gold' | 'teal' | 'coral' | 'purple';

export type SocialFeedAuthor = {
  clientId: string;
  fullName: string;
  avatar: string;
};

export type WorkoutMedia = {
  uri: string;
  type: 'image' | 'video';
  mimeType?: string;
};

type SocialFeedBase = {
  _id: string;
  clientId: string;
  author: SocialFeedAuthor;
  createdAt: string;
  likes: number;
  comments: number;
};

export type SocialFeedWorkout = SocialFeedBase & {
  kind: 'workout';
  workoutHistoryId: string;
  week: number;
  day: string;
  focus: string;
  duration: string;
  durationMinutes: number;
  exerciseCount: number;
  media?: WorkoutMedia[];
};

export type SocialFeedWeight = SocialFeedBase & {
  kind: 'weight';
  weightId: string;
  label: string;
  previousKg: number;
  currentKg: number;
  unit: string;
};

export type SocialFeedMeasurement = SocialFeedBase & {
  kind: 'measurement';
  measurementId: string;
  MeasurementId: string;
  label: string;
  unit: string;
  value: number;
  delta: number;
  date: string;
};

export type SocialFeedSteps = SocialFeedBase & {
  kind: 'steps';
  dailyStepsId: string;
  date?: string;
  dayLabel: string;
  steps: number;
  goal: number;
  week?: number;
};

export type SocialFeedWellnessItem = {
  wellnessId: string;
  masterId: string;
  key: string;
  label: string;
  value: number;
};

export type SocialFeedWellness = SocialFeedBase & {
  kind: 'wellness';
  date: string;
  items: SocialFeedWellnessItem[];
};

export type SocialFeedPhotos = SocialFeedBase & {
  kind: 'photos';
  week: number;
  photos: string[];
};

export type SocialFeedChallenge = SocialFeedBase & {
  kind: 'challenge';
  title: string;
  completedDays: number;
  totalDays: number;
  completed: boolean;
};

export type SocialFeedEntry =
  | SocialFeedWorkout
  | SocialFeedWeight
  | SocialFeedMeasurement
  | SocialFeedSteps
  | SocialFeedWellness
  | SocialFeedPhotos
  | SocialFeedChallenge;

export type CommunityStats = {
  activeMembers: number;
  weeklyWorkouts: number;
  weeklySteps: number;
  weekRanking: StepsRankingEntry[];
  monthRanking: StepsRankingEntry[];
  hasEmbeddedRanking: boolean;
};

export type CommunityFeedKind = 'workout' | 'steps' | 'challenge';
export type SocialFeedFilterKey = 'all' | CommunityFeedKind;

export const COMMUNITY_FEED_KINDS: readonly CommunityFeedKind[] = [
  'workout',
  'steps',
  'challenge',
];

export const SOCIAL_FEED_FILTERS: { key: SocialFeedFilterKey; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'workout', label: 'Entrenos' },
  { key: 'steps', label: 'Pasos' },
  { key: 'challenge', label: 'Retos' },
];

export const SOCIAL_FEED_KIND_META: Record<
  SocialFeedKind,
  { label: string; tone: SocialFeedKindTone }
> = {
  workout: { label: 'Entreno', tone: 'blue' },
  steps: { label: 'Pasos', tone: 'teal' },
  weight: { label: 'Peso', tone: 'gold' },
  measurement: { label: 'Medida', tone: 'purple' },
  wellness: { label: 'Sensaciones', tone: 'coral' },
  photos: { label: 'Fotos', tone: 'gold' },
  challenge: { label: 'Reto', tone: 'gold' },
};

export function formatRelativeTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hace 1 d';
  if (days < 7) return `hace ${days} d`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function socialFeedAction(entry: SocialFeedEntry): string {
  switch (entry.kind) {
    case 'workout':
      return `completó ${entry.day} · ${entry.focus}`;
    case 'weight': {
      const delta = entry.currentKg - entry.previousKg;
      if (delta < 0) return `bajó ${Math.abs(delta).toFixed(1).replace('.', ',')} ${entry.unit}`;
      if (delta > 0) return `subió ${delta.toFixed(1).replace('.', ',')} ${entry.unit}`;
      return `registró ${entry.currentKg} ${entry.unit}`;
    }
    case 'measurement': {
      const abs = Math.abs(entry.delta);
      if (entry.delta < 0) return `mejoró ${entry.label.toLowerCase()} ${abs} ${entry.unit}`;
      if (entry.delta > 0) return `registró ${entry.label.toLowerCase()} +${abs} ${entry.unit}`;
      return `registró ${entry.label.toLowerCase()}`;
    }
    case 'steps':
      return `alcanzó ${entry.steps.toLocaleString('es-ES')} pasos`;
    case 'wellness':
      return 'registró sensaciones del día';
    case 'photos':
      return `subió fotos de progreso · Semana ${entry.week}`;
    case 'challenge':
      return entry.completed
        ? `superó el reto “${entry.title}”`
        : `avanza en el reto “${entry.title}”`;
  }
}

export function socialFeedDetail(entry: SocialFeedEntry): string {
  switch (entry.kind) {
    case 'workout':
      return `${entry.exerciseCount} ejercicios · ${entry.duration} · Semana ${entry.week}`;
    case 'weight':
      return `${entry.previousKg} ${entry.unit} → ${entry.currentKg} ${entry.unit}`;
    case 'measurement':
      return `${entry.label}: ${entry.value} ${entry.unit} (Δ ${entry.delta > 0 ? '+' : ''}${entry.delta})`;
    case 'steps':
      return entry.date
        ? `Objetivo ${entry.goal.toLocaleString('es-ES')} · ${entry.dayLabel} · ${entry.date}`
        : entry.week
          ? `Objetivo ${entry.goal.toLocaleString('es-ES')} · ${entry.dayLabel} · Semana ${entry.week}`
          : `Objetivo ${entry.goal.toLocaleString('es-ES')} · ${entry.dayLabel}`;
    case 'wellness':
      return entry.items.map((item) => `${item.label} ${item.value}/10`).join(' · ');
    case 'photos':
      return `${entry.photos.length} foto${entry.photos.length === 1 ? '' : 's'}`;
    case 'challenge':
      return `Racha de ${entry.completedDays}/${entry.totalDays} días`;
  }
}

export function socialFeedMetric(entry: SocialFeedEntry): string | undefined {
  switch (entry.kind) {
    case 'weight': {
      const delta = entry.currentKg - entry.previousKg;
      const sign = delta > 0 ? '+' : '';
      return `${sign}${delta.toFixed(1).replace('.', ',')} ${entry.unit}`;
    }
    case 'measurement':
      return `${entry.delta > 0 ? '+' : ''}${entry.delta} ${entry.unit}`;
    case 'steps':
      return `${(entry.steps / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    case 'challenge':
      return `${entry.completedDays}/${entry.totalDays}`;
    default:
      return undefined;
  }
}

export function communityAvatarUrl(name: string, avatar?: string): string {
  const trimmed = (avatar ?? '').trim();
  if (trimmed) return trimmed;
  return fallbackAvatarUrl(name);
}

export function fallbackAvatarUrl(name: string): string {
  const encoded = encodeURIComponent(name.trim() || 'Cliente');
  return `https://ui-avatars.com/api/?name=${encoded}&background=0A1B33&color=F2C868&size=128`;
}

export function normalizeSocialFeedEntry(raw: Record<string, unknown>): SocialFeedEntry | null {
  const kind = String(raw['kind'] ?? '') as SocialFeedKind;
  const authorRaw =
    raw['author'] && typeof raw['author'] === 'object' && !Array.isArray(raw['author'])
      ? (raw['author'] as Record<string, unknown>)
      : {};
  const fullName = String(authorRaw['fullName'] ?? raw['fullName'] ?? 'Cliente');
  const base = {
    _id: normalizeId(raw['_id'] ?? raw['id']),
    clientId: normalizeId(raw['clientId'] ?? authorRaw['clientId']),
    author: {
      clientId: normalizeId(authorRaw['clientId'] ?? raw['clientId']),
      fullName,
      avatar: communityAvatarUrl(fullName, String(authorRaw['avatar'] ?? '')),
    },
    createdAt: String(raw['createdAt'] ?? ''),
    likes: Number(raw['likes'] ?? 0),
    comments: Number(raw['comments'] ?? 0),
  };

  switch (kind) {
    case 'workout': {
      const mediaRaw = Array.isArray(raw['media']) ? raw['media'] : [];
      const media = mediaRaw
        .map((entry) => {
          const item =
            entry && typeof entry === 'object' && !Array.isArray(entry)
              ? (entry as Record<string, unknown>)
              : {};
          const uri = String(item['uri'] ?? item['url'] ?? '').trim();
          const typeRaw = String(item['type'] ?? '').trim();
          const type: WorkoutMedia['type'] | null =
            typeRaw === 'video' ? 'video' : typeRaw === 'image' ? 'image' : null;
          if (!uri || !type) return null;
          return {
            uri,
            type,
            ...(item['mimeType'] ? { mimeType: String(item['mimeType']) } : {}),
          };
        })
        .filter((item): item is WorkoutMedia => item != null);

      return {
        ...base,
        kind,
        workoutHistoryId: normalizeId(raw['workoutHistoryId']),
        week: Number(raw['week'] ?? 0),
        day: String(raw['day'] ?? ''),
        focus: String(raw['focus'] ?? ''),
        duration: String(raw['duration'] ?? ''),
        durationMinutes: Number(raw['durationMinutes'] ?? 0),
        exerciseCount: Number(raw['exerciseCount'] ?? 0),
        ...(media.length > 0 ? { media } : {}),
      };
    }
    case 'weight':
      return {
        ...base,
        kind,
        weightId: normalizeId(raw['weightId']),
        label: String(raw['label'] ?? ''),
        previousKg: Number(raw['previousKg'] ?? 0),
        currentKg: Number(raw['currentKg'] ?? 0),
        unit: String(raw['unit'] ?? 'kg'),
      };
    case 'measurement':
      return {
        ...base,
        kind,
        measurementId: normalizeId(raw['measurementId']),
        MeasurementId: normalizeId(raw['MeasurementId']),
        label: String(raw['label'] ?? ''),
        unit: String(raw['unit'] ?? ''),
        value: Number(raw['value'] ?? 0),
        delta: Number(raw['delta'] ?? 0),
        date: String(raw['date'] ?? ''),
      };
    case 'steps':
      return {
        ...base,
        kind,
        dailyStepsId: normalizeId(raw['dailyStepsId']),
        date: raw['date'] != null ? String(raw['date']).slice(0, 10) : undefined,
        week: raw['week'] != null ? Number(raw['week']) : undefined,
        dayLabel: String(raw['dayLabel'] ?? raw['date'] ?? ''),
        steps: Number(raw['steps'] ?? 0),
        goal: Number(raw['goal'] ?? 0),
      };
    case 'wellness': {
      const itemsRaw = Array.isArray(raw['items']) ? raw['items'] : [];
      return {
        ...base,
        kind,
        date: String(raw['date'] ?? ''),
        items: itemsRaw.map((item) => {
          const row =
            item && typeof item === 'object' && !Array.isArray(item)
              ? (item as Record<string, unknown>)
              : {};
          return {
            wellnessId: normalizeId(row['wellnessId']),
            masterId: normalizeId(row['masterId']),
            key: String(row['key'] ?? ''),
            label: String(row['label'] ?? ''),
            value: Number(row['value'] ?? 0),
          };
        }),
      };
    }
    case 'photos':
      return {
        ...base,
        kind,
        week: Number(raw['week'] ?? 0),
        photos: Array.isArray(raw['photos']) ? raw['photos'].map(String) : [],
      };
    case 'challenge':
      return {
        ...base,
        kind,
        title: String(raw['title'] ?? ''),
        completedDays: Number(raw['completedDays'] ?? 0),
        totalDays: Number(raw['totalDays'] ?? 0),
        completed: Boolean(raw['completed']),
      };
    default:
      return null;
  }
}

export function normalizeCommunityStats(raw: Record<string, unknown>): CommunityStats {
  const week = readRanking(raw, [
    'weekRanking',
    'weeklyRanking',
    'rankingWeek',
    'stepsWeek',
    'week',
  ]);
  const month = readRanking(raw, [
    'monthRanking',
    'monthlyRanking',
    'rankingMonth',
    'stepsMonth',
    'month',
  ]);
  const nested =
    raw['ranking'] && typeof raw['ranking'] === 'object' && !Array.isArray(raw['ranking'])
      ? (raw['ranking'] as Record<string, unknown>)
      : {};
  const nestedWeek = week.found
    ? week
    : readRanking(nested, ['week', 'weekly', 'weekRanking']);
  const nestedMonth = month.found
    ? month
    : readRanking(nested, ['month', 'monthly', 'monthRanking']);

  return {
    activeMembers: Number(raw['activeMembers'] ?? 0),
    weeklyWorkouts: Number(raw['weeklyWorkouts'] ?? 0),
    weeklySteps: Number(raw['weeklySteps'] ?? raw['newPhotos'] ?? 0),
    weekRanking: nestedWeek.entries,
    monthRanking: nestedMonth.entries,
    hasEmbeddedRanking: nestedWeek.found || nestedMonth.found,
  };
}

function readRanking(
  raw: Record<string, unknown>,
  keys: string[],
): { found: boolean; entries: StepsRankingEntry[] } {
  for (const key of keys) {
    const value = raw[key];
    if (Array.isArray(value)) {
      return {
        found: true,
        entries: value
          .map((item) =>
            item && typeof item === 'object' && !Array.isArray(item)
              ? normalizeStepsRankingEntry(item as Record<string, unknown>)
              : null,
          )
          .filter((item): item is StepsRankingEntry => !!item && !!item.clientId),
      };
    }
  }
  return { found: false, entries: [] };
}
