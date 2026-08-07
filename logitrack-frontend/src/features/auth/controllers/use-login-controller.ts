'use client'

import { useActionState, useCallback, useState } from 'react'
import { signInAction, type LoginFormState } from '../actions'

const INITIAL_STATE: LoginFormState = {}

/**
 * Orquestra o formulario de login. Nao retorna JSX e nao conhece Tailwind.
 *
 * O submit e uma Server Action: so o servidor ve a senha e so o servidor pode
 * gravar o cookie httpOnly com o JWT. `useActionState` cuida do estado de envio
 * e devolve a mensagem de erro vinda do backend.
 *
 * Nao le `useSearchParams` de proposito — isso forcaria a pagina a renderizar
 * no cliente. Os parametros chegam por prop, lidos na `page.tsx`.
 */
export function useLoginController() {
  const [state, formAction, isSubmitting] = useActionState(signInAction, INITIAL_STATE)
  const [isPasswordVisible, setPasswordVisible] = useState(false)

  const togglePasswordVisibility = useCallback(() => setPasswordVisible((visible) => !visible), [])

  return {
    formAction,
    isSubmitting,
    errorMessage: state.error,
    isPasswordVisible,
    togglePasswordVisibility,
  }
}
