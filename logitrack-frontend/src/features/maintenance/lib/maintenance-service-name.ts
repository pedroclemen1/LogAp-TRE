type BuiltInMaintenanceServiceKey =
  | 'oilChange'
  | 'brakeInspection'
  | 'wheelAlignment'
  | 'tireReplacement'
  | 'unspecified'

const BUILT_IN_NAMES: Record<string, BuiltInMaintenanceServiceKey> = {
  'troca de oleo': 'oilChange',
  'revisao de freios': 'brakeInspection',
  alinhamento: 'wheelAlignment',
  'troca de pneus': 'tireReplacement',
  'servico nao informado': 'unspecified',
}

const ENGLISH_NAMES: Record<string, string> = {
  'oil change': 'Troca de Óleo',
  'brake inspection': 'Revisão de Freios',
  'wheel alignment': 'Alinhamento',
  'tire replacement': 'Troca de Pneus',
  'unspecified service': 'Serviço não informado',
}

function normalize(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

/** Traduz somente dados de demonstração conhecidos; nomes criados pelo usuário são preservados. */
export function builtInMaintenanceServiceKey(name: string): BuiltInMaintenanceServiceKey | undefined {
  return BUILT_IN_NAMES[normalize(name)]
}

/** Converte uma busca pelo nome traduzido para o valor armazenado na base. */
export function maintenanceServiceSearchSource(search: string, locale: string): string {
  if (locale !== 'en-US') return search
  return ENGLISH_NAMES[normalize(search)] ?? search
}
