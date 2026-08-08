import 'server-only'

import { apiFetch, apiFetchPublic } from '@/shared/api/server-fetch'

export type UserRole = 'OPERADOR' | 'GESTOR'

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
  perfil: UserRole
  trocaSenhaObrigatoria: boolean
}

export type AuthenticatedUser = {
  token: string
  expiresAt: string
  name: string
  email: string
  role: UserRole
  passwordChangeRequired: boolean
}

function toAuthenticatedUser(dto: LoginResponseDto): AuthenticatedUser {
  return {
    token: dto.token,
    expiresAt: dto.expiraEm,
    name: dto.nome,
    email: dto.email,
    role: dto.perfil,
    passwordChangeRequired: dto.trocaSenhaObrigatoria,
  }
}

export async function login(
  email: string,
  senha: string,
  signedClientIdentity: string,
): Promise<AuthenticatedUser> {
  const dto = await apiFetchPublic<LoginResponseDto>('/api/auth/login', {
    method: 'POST',
    body: { email, senha } satisfies LoginRequestDto,
    headers: { 'X-Logap-Login-Client': signedClientIdentity },
  })

  return toAuthenticatedUser(dto)
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<AuthenticatedUser> {
  const dto = await apiFetch<LoginResponseDto>('/api/auth/password', {
    method: 'PATCH',
    body: {
      senhaAtual: currentPassword,
      novaSenha: newPassword,
    },
  })
  return toAuthenticatedUser(dto)
}
