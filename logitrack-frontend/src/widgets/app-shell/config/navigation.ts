/**
 * Configuracao estatica de navegacao. Separada da logica de rota ativa
 * (`SidebarNav`) para poder ser importada por Server Components sem arrastar
 * `usePathname` junto.
 *
 * Itens sem tela implementada nao entram aqui; configuracoes sera acessada em
 * outro ponto da aplicacao quando o modulo existir.
 */
type NavItem = {
  href: string
  key: 'overview' | 'trips' | 'manifests' | 'drivers' | 'maintenance' | 'maintenanceServices' | 'vehicles'
  icon: string
  /** Ativo apenas em correspondencia exata (usado pela raiz). */
  exact?: boolean
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', key: 'overview', icon: 'dashboard', exact: true },
  { href: '/viagens', key: 'trips', icon: 'local_shipping' },
  { href: '/romaneios', key: 'manifests', icon: 'description' },
  { href: '/motoristas', key: 'drivers', icon: 'badge' },
  { href: '/manutencoes', key: 'maintenance', icon: 'build' },
  { href: '/servicos-manutencao', key: 'maintenanceServices', icon: 'home_repair_service' },
  { href: '/frota', key: 'vehicles', icon: 'directions_car' },
] as const

/** Compartilhado entre os itens de navegacao e os botoes do rodape da sidebar. */
const SIDEBAR_ITEM_BASE =
  'flex items-center gap-3 rounded-r-xs border-l-4 px-3 py-3 font-body-sm text-body-sm ' +
  'transition-[background-color,color,border-color,box-shadow] duration-150 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sidebar-accent'
export const SIDEBAR_ITEM_IDLE =
  `${SIDEBAR_ITEM_BASE} border-transparent text-on-sidebar-variant ` +
  'hover:border-sidebar-accent hover:bg-sidebar-hover hover:text-on-sidebar hover:shadow-sm'
export const SIDEBAR_ITEM_ACTIVE =
  `${SIDEBAR_ITEM_BASE} border-sidebar-accent bg-sidebar-active font-semibold text-on-sidebar shadow-sm`
