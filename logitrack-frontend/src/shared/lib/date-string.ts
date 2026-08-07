/**
 * Datas da API sao HORARIO DE PAREDE, nao instantes.
 *
 * O backend devolve `LocalDate` ("2024-05-20") e `LocalDateTime`
 * ("2026-08-10T05:21:46.874687") — ambos SEM offset. Pela especificacao do
 * ECMAScript, `new Date("2026-08-10T05:21:46")` interpreta a string como hora
 * LOCAL do processo. Consequencia medida:
 *
 *   container TZ=UTC        -> 02:21
 *   maquina TZ=Sao_Paulo    -> 05:21
 *   valor real no banco     -> 05:21
 *
 * Ou seja: converter para `Date` e formatar com `timeZone` desloca o horario.
 * Por isso estes helpers trabalham por fatiamento de string e nunca constroem
 * um `Date` a partir desses valores.
 *
 * A UNICA data da API que e um instante de verdade e `LoginResponse.expiraEm`
 * (`OffsetDateTime`, termina em `Z` ou com offset) — la `new Date()` e correto.
 */

/** "2026-08-10T05:21:46.874687" -> { date: "2026-08-10", time: "05:21" } */
export function splitLocalDateTime(value: string): { date: string; time: string } {
  const [date, rest = ''] = value.split('T')
  return { date, time: rest.slice(0, 5) }
}

/** "2024-05-20" -> { year: 2024, month: 5, day: 20 } */
export function parseLocalDate(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return { year, month, day }
}

/**
 * Diferenca em dias inteiros entre duas datas "YYYY-MM-DD".
 * Ancorar os dois lados em UTC e seguro: o deslocamento se cancela.
 */
export function diffInDays(from: string, to: string): number {
  const a = parseLocalDate(from)
  const b = parseLocalDate(to)
  const msPerDay = 86_400_000
  return Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / msPerDay,
  )
}

/**
 * Data de hoje no fuso da operacao, como "YYYY-MM-DD".
 *
 * E a UNICA leitura de relogio da camada de dados. As funcoes de mapeamento
 * recebem esse valor por parametro para continuarem puras — assim uma
 * requisicao inteira enxerga o mesmo "hoje" e o resultado e testavel.
 */
export function todayLocalDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
