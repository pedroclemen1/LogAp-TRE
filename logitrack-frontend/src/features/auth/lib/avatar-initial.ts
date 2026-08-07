export function avatarInitialFromEmail(email: string | undefined): string {
  const normalized = email?.trim()
  if (!normalized || normalized.indexOf('@') < 1) return '?'

  const [initial] = Array.from(normalized)
  return initial.toLocaleUpperCase('pt-BR')
}
