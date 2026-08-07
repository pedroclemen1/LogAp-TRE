import { BrandIdentity } from './brand-identity'
import { SidebarFooter } from './sidebar-footer'
import { SidebarNav } from './sidebar-nav'

/**
 * Server Component. Apenas a lista de navegacao (rota ativa) e o rodape
 * (tema/logout) sao client.
 */
export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-sidebar-width flex-col border-r border-outline-variant bg-sidebar text-on-sidebar lg:flex">
      <div className="flex h-shell-header-height shrink-0 items-center justify-center border-b border-outline-variant/20 px-6">
        <BrandIdentity />
      </div>

      <SidebarNav />
      <SidebarFooter />
    </aside>
  )
}
