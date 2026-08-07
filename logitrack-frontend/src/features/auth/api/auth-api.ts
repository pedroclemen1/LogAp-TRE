import 'server-only'

import { apiFetchPublic } from '@/shared/api/server-fetch'

/** Espelho de `LoginRequest`/`LoginResponse` do backend. */
type LoginRequestDto = {
  email: string
  senha: string
}

type LoginResponseDto = {
  token: string
  /** ISO-8601 com offset, ex: "2026-08-07T10:22:04.195-03:00". */
  expiraEm: string
  nome: string
  email: string
  perfil: 'OPERADOR' | 'GESTOR'
}

type AuthenticatedUser = {
  token: string
  expiresAt: string
  name: string
  email: string
  role: 'OPERADOR' | 'GESTOR'
}

export async function login(email: string, senha: string): Promise<AuthenticatedUser> {
  const dto = await apiFetchPublic<LoginResponseDto>('/api/auth/login', {
    method: 'POST',
    body: { email, senha } satisfies LoginRequestDto,
  })

  return {
    token: dto.token,
    expiresAt: dto.expiraEm,
    name: dto.nome,
    email: dto.email,
    role: dto.perfil,
  }
}
