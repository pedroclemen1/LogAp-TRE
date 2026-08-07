'use client'

import { useCallback, useInsertionEffect, useRef } from 'react'

/**
 * Envolve um callback numa funcao de identidade ESTAVEL que sempre chama a
 * versao mais recente.
 *
 * POR QUE EXISTE: quem consome um controller de formulario costuma passar
 * `onSuccess={() => { fecharModal(); router.refresh() }}` — uma arrow inline,
 * portanto com identidade nova a cada render. Colocada na lista de dependencias
 * de um `useEffect` que reage a `status === 'success'`, ela produz um laco
 * infinito:
 *
 *   sucesso -> efeito -> onSuccess() -> router.refresh() -> novo render
 *           -> nova identidade de onSuccess -> efeito roda de novo
 *           -> status AINDA e 'success' -> onSuccess() -> ...
 *
 * O `<Modal>` do projeto usa `<dialog>` nativo e mantem os filhos montados
 * quando fechado, entao o controller nao desmonta e o laco nao para sozinho.
 *
 * `useInsertionEffect` atualiza a ref antes de qualquer efeito de layout ou
 * efeito comum rodar, entao o efeito consumidor nunca le uma versao velha.
 * E o mesmo padrao do `useEffectEvent` que o React ainda nao estabilizou.
 */
export function useEventCallback<Args extends unknown[], Result>(
  callback: ((...args: Args) => Result) | undefined,
): (...args: Args) => Result | undefined {
  const ref = useRef(callback)

  useInsertionEffect(() => {
    ref.current = callback
  }, [callback])

  return useCallback((...args: Args) => ref.current?.(...args), [])
}
