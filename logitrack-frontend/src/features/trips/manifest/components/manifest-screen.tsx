'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import type { AppLocale } from '@/i18n/config'
import type { Paged } from '@/shared/api/page'
import { formatInteger } from '@/shared/lib/format'
import { paginationWindow } from '@/shared/lib/pagination'
import { currentSheet, downloadSheetPdf } from '@/shared/lib/sheet-pdf'
import { Button } from '@/shared/ui/button'
import { Icon } from '@/shared/ui/icon'
import { Modal } from '@/shared/ui/modal'
import { PaginationArrow } from '@/shared/ui/pagination'
import { Surface } from '@/shared/ui/surface'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { useToast } from '@/shared/ui/use-toast'
import { TripPageSizeSelect } from '@/features/trips/components/trip-page-size-select'
import { TripsToolbar } from '@/features/trips/components/trips-toolbar'
import { tripFiltersToQuery, type TripFilters, type TripPageSize } from '@/features/trips/model/trip-filters'
import type { VehicleOption } from '@/features/trips/model/trip'
import { loadManifestAction } from '../actions'
import type { Manifest, ManifestCandidate, ManifestStage } from '../model/manifest'
import { ManifestForm } from './manifest-form'
import { ManifestTripRow } from './manifest-trip-row'
import { ManifestIssuedBy, ManifestView } from './manifest-view'

const TH = 'p-3 tracking-wider'
const PAGE_BUTTON =
  'flex h-7 min-w-7 items-center justify-center rounded-xs px-2 font-data-mono text-data-mono transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

/** O que o modal do documento está mostrando. */
type Editor =
  | { mode: 'issue'; candidate: ManifestCandidate; stage: ManifestStage }
  | { mode: 'edit'; candidate: ManifestCandidate; stage: ManifestStage; manifest: Manifest }

export function ManifestScreen({
  candidates,
  filters,
  size,
  vehicles,
}: {
  candidates: Paged<ManifestCandidate>
  filters: TripFilters
  size: TripPageSize
  vehicles: readonly VehicleOption[]
}) {
  const t = useTranslations('Manifest.screen')
  const locale = useLocale() as AppLocale
  const router = useRouter()
  const { showToast } = useToast()

  const [expandedTrip, setExpandedTrip] = useState<number>()
  const [editor, setEditor] = useState<Editor>()
  const [viewing, setViewing] = useState<Manifest>()
  const [isLoading, startLoading] = useTransition()
  const [isDownloading, setDownloading] = useState(false)

  async function baixarPdf(manifest: Manifest) {
    setDownloading(true)
    const resultado = await downloadSheetPdf(currentSheet(), `${manifest.number}.pdf`)
    setDownloading(false)
    if (resultado !== 'ok') {
      showToast({ tone: 'error', title: t('pdfFailedTitle'), description: t('pdfFailedDescription') })
    }
  }

  /** Busca o documento e entrega ao chamador — visualizar ou editar. */
  function withManifest(manifestId: number, use: (manifest: Manifest) => void) {
    startLoading(async () => {
      const result = await loadManifestAction(manifestId)
      if (result.status === 'error') {
        showToast({ tone: 'error', title: t('loadFailed'), description: result.message })
        return
      }
      use(result.manifest)
    })
  }

  function hrefForPage(page: number): string {
    const query = tripFiltersToQuery(filters, size)
    if (page > 0) query.set('page', String(page + 1))
    const search = query.toString()
    return search ? `/romaneios?${search}` : '/romaneios'
  }

  /** Usa o snapshot do documento para não misturar a edição com uma rota alterada depois. */
  function stageFromManifest(manifest: Manifest): ManifestStage {
    return {
      stageId: manifest.stageId,
      order: manifest.stageOrder,
      origin: manifest.originName,
      destination: manifest.destinationName,
      distanceKm: manifest.distanceKm,
      loadKg: 0,
      completed: true,
      manifestId: manifest.id,
    }
  }

  function candidateFromManifest(manifest: Manifest, stage: ManifestStage): ManifestCandidate {
    return {
      tripId: manifest.tripId,
      departureAt: manifest.issuedAt,
      origin: manifest.originName,
      destination: manifest.destinationName,
      vehiclePlate: manifest.vehiclePlate,
      vehicleModel: manifest.vehicleDescription,
      driverName: manifest.driverName,
      driverLicense: manifest.driverLicense,
      status: 'completed',
      stages: [stage],
    }
  }

  const pages = paginationWindow(candidates.page, candidates.totalPages)

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <h2 className="font-headline-md text-headline-md text-on-surface">{t('title')}</h2>
        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{t('subtitle')}</p>
      </div>

      <TripsToolbar pathname="/romaneios" filters={filters} size={size} vehicles={vehicles} />

      <Surface className="overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table className="min-w-[880px]">
            <TableHeader className="border-b border-outline-variant bg-table-header">
              <TableRow>
                <TableHead className={`${TH} w-14`} aria-label={t('expand')} />
                <TableHead className={TH}>{t('tripId')}</TableHead>
                <TableHead className={TH}>{t('dateTime')}</TableHead>
                <TableHead className={TH}>{t('route')}</TableHead>
                <TableHead className={TH}>{t('vehicleDriver')}</TableHead>
                <TableHead className={TH}>{t('status')}</TableHead>
                <TableHead className={`${TH} w-32 text-right`}>{t('manifest')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-outline-variant/50 bg-surface">
              {candidates.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="p-8 text-center text-on-surface-variant">
                    {t('emptyAvailable')}
                  </TableCell>
                </TableRow>
              )}
              {candidates.items.map((candidate) => (
                <ManifestTripRow
                  key={candidate.tripId}
                  candidate={candidate}
                  expanded={expandedTrip === candidate.tripId}
                  busy={isLoading}
                  onToggle={() => setExpandedTrip(
                    expandedTrip === candidate.tripId ? undefined : candidate.tripId,
                  )}
                  onIssue={(stage) => setEditor({ mode: 'issue', candidate, stage })}
                  onView={(manifestId) => withManifest(manifestId, setViewing)}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        <TableFooter className="gap-3 px-4 py-2">
          <TripPageSizeSelect pathname="/romaneios" filters={filters} size={size} />
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {t('availableRange', {
              first: formatInteger(candidates.firstItem, locale),
              last: formatInteger(candidates.lastItem, locale),
              total: formatInteger(candidates.totalItems, locale),
            })}
          </span>
          <div className="flex items-center gap-1">
            <PaginationArrow
              direction="previous"
              href={candidates.isFirst ? undefined : hrefForPage(candidates.page - 1)}
              className="p-1 text-on-surface-variant hover:text-on-surface"
            />
            {pages.map((page) => (
              <Link
                key={page}
                href={hrefForPage(page)}
                aria-current={page === candidates.page ? 'page' : undefined}
                className={`${PAGE_BUTTON} ${
                  page === candidates.page
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                {page + 1}
              </Link>
            ))}
            <PaginationArrow
              direction="next"
              href={candidates.isLast ? undefined : hrefForPage(candidates.page + 1)}
              className="p-1 text-on-surface-variant hover:text-on-surface"
            />
          </div>
        </TableFooter>
      </Surface>

      <Modal
        fullScreen
        open={editor !== undefined}
        onClose={() => setEditor(undefined)}
        title={editor?.mode === 'edit' ? t('editTitle', { number: editor.manifest.number }) : t('issueTitle')}
        description={editor
          ? t('issueDescription', { id: editor.candidate.tripId, order: editor.stage.order })
          : ''}
      >
        {editor && (
          <ManifestForm
            key={editor.mode === 'edit' ? `edit-${editor.manifest.id}` : `issue-${editor.stage.stageId}`}
            candidate={editor.candidate}
            stage={editor.stage}
            existing={editor.mode === 'edit' ? editor.manifest : undefined}
            onCancel={() => setEditor(undefined)}
            onSaved={(manifestId) => {
              const wasEditing = editor.mode === 'edit'
              setEditor(undefined)
              router.refresh()
              showToast({
                tone: 'success',
                title: wasEditing ? t('updatedTitle') : t('issuedTitle'),
                description: wasEditing ? t('updatedDescription') : t('issuedDescription'),
              })
              withManifest(manifestId, setViewing)
            }}
          />
        )}
      </Modal>

      <Modal
        fullScreen
        open={viewing !== undefined}
        onClose={() => setViewing(undefined)}
        title={viewing ? t('viewTitle', { number: viewing.number }) : ''}
        description={t('viewDescription')}
      >
        {viewing && (
          <div className="space-y-4">
            <ManifestView manifest={viewing} />
            <ManifestIssuedBy manifest={viewing} />
            <div className="mx-auto flex max-w-[960px] flex-wrap justify-end gap-2">
              <Button onClick={() => setViewing(undefined)}>{t('close')}</Button>
              <Button
                onClick={() => {
                  const manifest = viewing
                  const stage = stageFromManifest(manifest)
                  setViewing(undefined)
                  setEditor({
                    mode: 'edit',
                    candidate: candidateFromManifest(manifest, stage),
                    stage,
                    manifest,
                  })
                }}
              >
                <Icon name="edit" className="text-[18px]" /> {t('edit')}
              </Button>
              <Button variant="primary" disabled={isDownloading} onClick={() => baixarPdf(viewing)}>
                <Icon name="picture_as_pdf" className="text-[18px]" />
                {isDownloading ? t('downloading') : t('downloadPdf')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
