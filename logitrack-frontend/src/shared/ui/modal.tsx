'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { IconButton } from './icon-button'

type ModalProps = {
  open: boolean
  /** Chamado por Esc, clique no fundo e no botao de fechar. */
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  className?: string
  /**
   * Ocupa a viewport inteira, com o conteudo rolando na vertical.
   *
   * Para o romaneio: o documento e largo e nao pode ficar preso numa caixa
   * estreita, senao a tabela de carga vira scroll lateral dentro de scroll
   * lateral. Em tela cheia so ha uma barra de rolagem, a vertical.
   */
  fullScreen?: boolean
}

/**
 * Dialogo sobre `<dialog>` nativo com `showModal()`.
 *
 * A alternativa — uma div com position fixed — obrigaria a reimplementar a mao
 * armadilha de foco, fechar no Esc, inertizar o resto da pagina e a camada de
 * topo. O elemento nativo entrega tudo isso e nao entra em disputa de z-index,
 * porque vive na top layer do navegador.
 *
 * `m-auto` e necessario: o preflight do Tailwind zera a margem de todo
 * elemento, e e justamente `margin: auto` que centraliza um dialog modal.
 */
export function Modal({ open, onClose, title, description, children, className, fullScreen }: ModalProps) {
  const t = useTranslations('Common')
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  // O estado e a prop `open`; o elemento nativo tem estado proprio. Este efeito
  // mantem os dois em sincronia sem nunca chamar showModal() num dialog ja
  // aberto, o que lancaria InvalidStateError.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // Clique no fundo tem como alvo o proprio <dialog>; clique no conteudo
      // tem como alvo um filho. E assim que se distingue um do outro.
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className={
        fullScreen
          /*
           * `flex` SÓ quando aberto — e isto não é cosmético.
           *
           * O navegador esconde diálogo fechado com `dialog:not([open]) {
           * display: none }`, que vem do USER-AGENT. Regra de autor vence regra
           * de user-agent independentemente de especificidade, então um `flex`
           * incondicional do Tailwind reativava o display: o diálogo fechado,
           * com `fixed inset-0` e `bg-surface`, cobria a viewport inteira e a
           * página parecia em branco — com o cabeçalho do modal aparecendo
           * sozinho, porque o corpo é renderizado condicionalmente.
           *
           * Os modais normais nunca sofreram disso: não usam utilitário de
           * display, então o `display: none` do navegador continua valendo.
           *
           * `max-w-none`/`max-h-none` derrubam o limite que o navegador impõe a
           * um <dialog> (100% menos a margem). `inset-0` em vez de `w-screen`
           * porque 100vw INCLUI a barra de rolagem vertical e criava scroll
           * horizontal na página inteira.
           *
           * `h-dvh` e não `h-auto`: o corpo rola com `flex-1 min-h-0`, e isso
           * só resolve se o container tiver ALTURA DEFINIDA. Com `h-auto` o
           * conteúdo que passava da viewport era cortado em vez de rolar — o
           * documento sumia a partir de ~7 itens de carga.
           */
          ? `fixed inset-0 m-0 ${open ? 'flex' : ''} h-dvh max-h-none w-auto max-w-none flex-col rounded-none border-0 bg-surface p-0 text-on-surface backdrop:bg-black/50 ${className ?? ''}`
          : `m-auto w-full max-w-lg rounded-xs border border-outline-variant bg-surface p-0 text-on-surface shadow-lg backdrop:bg-black/50 ${className ?? ''}`
      }
    >
      <div className={`flex items-start justify-between gap-4 border-b border-outline-variant px-6 py-4 ${
        fullScreen ? 'shrink-0' : ''
      }`}>
        <div>
          <h2 id={titleId} className="font-title-md text-title-md text-on-surface">
            {title}
          </h2>
          {description && (
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{description}</p>
          )}
        </div>
        <IconButton aria-label={t('close')} icon="close" iconClassName="text-[20px]" onClick={onClose} />
      </div>

      <div className={fullScreen ? 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6' : 'px-6 py-5'}>
        {children}
      </div>
    </dialog>
  )
}
