import type { Review } from '../models/review';

/** Revisiones ficticias con la misma forma que Review del API. */
export const MOCK_REVIEWS: Review[] = [
  {
    _id: 'rev-1',
    clientId: '6a620e6c10d4cdecdb7c6817',
    title: 'Revisión semanal · Semana 7',
    date: 'Vie 23 may · 17:00',
    status: 'upcoming',
    note: 'Sube 4 fotos y tus medidas 24h antes.',
  },
  {
    _id: 'rev-2',
    clientId: '6a620e6c10d4cdecdb7c6817',
    title: 'Revisión semanal · Semana 6',
    date: 'Vie 16 may · 17:00',
    status: 'done',
    note: 'Completada. ¡Gran progreso en cintura!',
  },
  {
    _id: 'rev-3',
    clientId: 'c-laura-mendez',
    title: 'Revisión semanal · Semana 2',
    date: 'Lun 26 may · 10:00',
    status: 'upcoming',
    note: 'Primera revisión de control.',
  },
  {
    _id: 'rev-4',
    clientId: 'c-maria-lopez',
    title: 'Revisión semanal · Semana 3',
    date: 'Mié 14 may · 18:00',
    status: 'done',
    note: 'Completada.',
  },
  {
    _id: 'rev-5',
    clientId: 'c-carlos-ruiz',
    title: 'Revisión semanal · Semana 10',
    date: 'Jue 8 may · 19:00',
    status: 'canceled',
    note: 'Cancelada por el cliente.',
  },
];
