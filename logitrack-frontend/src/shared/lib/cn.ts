type ClassValue = string | false | null | undefined

/**
 * Composicao de classes. Nao usamos `clsx` nem `tailwind-merge`: as classes
 * deste projeto sao literais controlados por nos e os overrides sao explicitos
 * (o chamador passa a classe vencedora por ultimo), entao a resolucao de
 * conflito do tailwind-merge nao traz beneficio que justifique a dependencia.
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
