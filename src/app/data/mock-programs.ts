import type { Program } from '../models/program';

export const MOCK_PROGRAMS: Program[] = [
  {
    _id: 'prog-nutricion',
    name: 'Nutrición',
    description: 'Plan nutricional personalizado sin entrenamiento estructurado.',
  },
  {
    _id: 'prog-entreno',
    name: 'Entrenamiento',
    description: 'Rutina de fuerza y hábitos sin seguimiento nutricional completo.',
  },
  {
    _id: 'prog-combo',
    name: 'Nutrición + Entrenamiento',
    description: 'Método Regenesis: nutrición y entrenamiento combinados.',
  },
];
