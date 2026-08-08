/**
 * Janela de datas aceitas pelos formularios operacionais.
 *
 * Espelha `BusinessDateWindow` do backend. A duplicacao e deliberada: os
 * atributos `min`/`max` do input impedem digitar o absurdo, mas nao protegem
 * nada — o DevTools os remove. A autoridade continua sendo o backend, que
 * recusa com HTTP 422. Aqui o objetivo e a pessoa nao descobrir o limite
 * depois de preencher o formulario inteiro.
 *
 * Os anos precisam ser iguais aos do backend. Divergencia produz o pior dos
 * mundos: o input aceita e o servidor recusa.
 */
const YEARS_BACK = 5
const YEARS_AHEAD = 2

/** `YYYY-MM-DD`, formato aceito por `<input type="date">`. */
function toDateValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function shiftYears(years: number): Date {
  const date = new Date()
  date.setFullYear(date.getFullYear() + years)
  return date
}

/** Limites para `<input type="date">`. */
export function dateBounds(): { min: string; max: string } {
  return {
    min: toDateValue(shiftYears(-YEARS_BACK)),
    max: toDateValue(shiftYears(YEARS_AHEAD)),
  }
}

/**
 * Limites para `<input type="datetime-local">`, que exige `YYYY-MM-DDTHH:mm`.
 * As bordas do dia mantem o intervalo inclusivo em qualquer horario.
 */
export function dateTimeBounds(): { min: string; max: string } {
  const bounds = dateBounds()
  return { min: `${bounds.min}T00:00`, max: `${bounds.max}T23:59` }
}

/**
 * Regra compartilhada pelas Server Actions. Recebe o valor cru do formulario,
 * que pode ser vazio ou malformado.
 *
 * Vazio devolve `true` porque ausencia e responsabilidade do `required` e da
 * checagem de campo obrigatorio, que produzem mensagem propria.
 */
export function isWithinDateWindow(value: string): boolean {
  if (!value) return true

  // Fatiamento em vez de `new Date(value)`: a API trabalha com data sem
  // offset, e construir Date aplicaria o fuso do processo, deslocando o dia.
  const day = value.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false

  const bounds = dateBounds()
  return day >= bounds.min && day <= bounds.max
}
