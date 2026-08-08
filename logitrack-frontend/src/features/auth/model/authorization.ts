/**
 * Capacidade apenas de apresentacao. A autorizacao efetiva permanece no backend.
 */
export function canManageMasterData(role: unknown): boolean {
  return role === 'GESTOR'
}
