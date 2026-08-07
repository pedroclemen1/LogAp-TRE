import { cn } from '@/shared/lib/cn'
import { Icon } from './icon'

/**
 * Caminho da rota, ponto a ponto: origem -> paradas -> destino.
 *
 * Mostrar so as pontas fazia duas viagens de trajetos diferentes parecerem
 * iguais na tabela — "Natal-RN -> Porto Alegre" some com o fato de a carga ter
 * passado por Recife. As cidades do meio ficam em tom secundario: sao escala,
 * nao a ponta da rota.
 *
 * Recebe o caminho ja montado, em vez do objeto de dominio, porque Viagens e
 * Romaneios derivam esse array de campos diferentes (`routeCities` num,
 * `stages` no outro) e o desenho e o mesmo nos dois. Por isso vive em `shared`
 * e nao dentro de uma feature.
 */
export function RoutePath({ path, className }: { path: readonly string[]; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-body-sm text-body-sm text-on-surface',
        className,
      )}
    >
      {path.map((city, index) => (
        <span key={`${city}-${index}`} className="flex items-center gap-1.5">
          {index > 0 && <Icon name="arrow_right_alt" className="text-[14px] text-outline" />}
          <span
            className={cn(
              'max-w-[140px] truncate',
              index > 0 && index < path.length - 1 && 'text-on-surface-variant',
            )}
            title={city}
          >
            {city}
          </span>
        </span>
      ))}
    </div>
  )
}
