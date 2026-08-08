import 'server-only'

import { apiFetch, apiFetchPublic } from '@/shared/api/server-fetch'
import type { UserRole } from './auth-api'

type InvitationValidationDto = {
  email: string
  perfil: UserRole
  expiraEm: string
}

type InvitationCreationDto = InvitationValidationDto & {
  activationUrl: string
}

export type InvitationDetails = {
  email: string
  role: UserRole
  expiresAt: string
}

export type CreatedInvitation = InvitationDetails & {
  activationUrl: string
}

function toDetails(dto: InvitationValidationDto): InvitationDetails {
  return {
    email: dto.email,
    role: dto.perfil,
    expiresAt: dto.expiraEm,
  }
}

export async function validateInvitation(token: string): Promise<InvitationDetails> {
  const dto = await apiFetchPublic<InvitationValidationDto>('/api/auth/invitations/validate', {
    method: 'POST',
    body: { token },
  })
  return toDetails(dto)
}

export async function acceptInvitation(token: string, name: string, password: string): Promise<void> {
  await apiFetchPublic<void>('/api/auth/invitations/accept', {
    method: 'POST',
    body: { token, nome: name, senha: password },
  })
}

export async function createInvitation(email: string, role: UserRole): Promise<CreatedInvitation> {
  const dto = await apiFetch<InvitationCreationDto>('/api/auth/invitations', {
    method: 'POST',
    body: { email, perfil: role },
  })
  return { ...toDetails(dto), activationUrl: dto.activationUrl }
}
