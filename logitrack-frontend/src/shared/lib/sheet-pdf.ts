'use client'

/** Captura a folha renderizada e gera o PDF somente quando solicitado. */

const A4_WIDTH_MM = 210
/** 2× resolve bem em tela e no papel sem inflar demais o arquivo. */
const CAPTURE_SCALE = 2
/** Teto para a espera das fontes; ver `fontsReady`. */
const FONT_TIMEOUT_MS = 3000

/** Marca o que existe só na tela e não deve entrar no documento. */
export const SHEET_IGNORE_ATTR = 'data-sheet-ignore'

type SheetPdfResult = 'ok' | 'no-sheet' | 'failed'

/** Mantém a largura A4 e ajusta a altura à proporção da folha. */
export function pageHeightMm(canvasWidth: number, canvasHeight: number): number {
  if (canvasWidth <= 0) return A4_WIDTH_MM
  return (canvasHeight / canvasWidth) * A4_WIDTH_MM
}

/** Evita capturar as ligaduras dos ícones antes da fonte, sem bloquear em falhas de rede. */
async function fontsReady(): Promise<void> {
  if (!document.fonts) return
  await Promise.race([
    document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS)),
  ])
}

export async function downloadSheetPdf(
  sheet: HTMLElement | null,
  fileName: string,
): Promise<SheetPdfResult> {
  if (typeof window === 'undefined') return 'failed'
  if (!sheet) return 'no-sheet'

  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas-pro'),
      import('jspdf'),
    ])

    await fontsReady()

    const canvas = await html2canvas(sheet, {
      scale: CAPTURE_SCALE,
      // A folha já é branca; sem isto o PDF herdaria o fundo escuro do tema.
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      ignoreElements: (element) => element.hasAttribute(SHEET_IGNORE_ATTR),
    })

    const alturaMm = pageHeightMm(canvas.width, canvas.height)
    const pdf = new jsPDF({
      unit: 'mm',
      format: [A4_WIDTH_MM, alturaMm],
      orientation: 'portrait',
      compress: true,
    })
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, A4_WIDTH_MM, alturaMm)
    pdf.save(fileName)
    return 'ok'
  } catch {
    return 'failed'
  }
}

/** A folha montada agora; só existe uma por vez (os modais são condicionais). */
export function currentSheet(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-manifest-sheet]')
}
