export type NormalizedType = 'TEMPERATURE' | 'PH' | 'OXYGEN' | 'LEVEL' | 'FLOW' | null;

export function normalizeSensorType(type?: string): NormalizedType {
  const t = type?.toUpperCase().trim();
  if (!t) return null;

  if (t === 'TEMPERATURE' || t === 'TEMPERATURA') return 'TEMPERATURE';
  if (t === 'PH') return 'PH';
  if (
    t === 'OXYGEN' ||
    t === 'OXIGENO' ||
    t === 'OXIGENO_DISUELTO' ||
    t === 'OXIGENO_DISUELTO' || // variantes comunes
    t === 'OXIGENO_DISUELTO'
  ) return 'OXYGEN';
  if (t === 'LEVEL' || t === 'NIVEL') return 'LEVEL';
  if (t === 'FLOW' || t === 'CAUDAL') return 'FLOW';

  return null;
}
