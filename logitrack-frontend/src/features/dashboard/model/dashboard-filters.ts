/** Única janela histórica da tela; evita divergência entre cards e gráficos. */
export const DASHBOARD_PERIOD_DAYS = 30

const DASHBOARD_CATEGORIES = ['all', 'light', 'heavy'] as const
type DashboardCategory = (typeof DASHBOARD_CATEGORIES)[number]

export type DashboardFilters = {
  category: DashboardCategory
}

export type DashboardSearchParams = {
  tipo?: string
}

export function parseDashboardFilters(params: DashboardSearchParams): DashboardFilters {
  const category = params.tipo?.toUpperCase()
  return {
    category: category === 'LEVE' ? 'light' : category === 'PESADO' ? 'heavy' : 'all',
  }
}
