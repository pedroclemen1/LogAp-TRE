export function paginationWindow(current: number, total: number, radius = 2): number[] {
  const start = Math.max(0, Math.min(current - radius, total - radius * 2 - 1))
  const end = Math.min(total - 1, start + radius * 2)
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, offset) => start + offset)
}
