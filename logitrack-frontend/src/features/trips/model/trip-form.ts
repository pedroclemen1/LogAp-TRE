const TRIP_FORM_FIELDS = ['veiculoId', 'motoristaId', 'dataSaida', 'origem'] as const
export type TripFormField = (typeof TRIP_FORM_FIELDS)[number]

export type TripFormState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: Record<string, string>
  values?: Partial<Record<TripFormField, string>>
}

export type TripMutationState =
  | { status: 'success' }
  | { status: 'error'; message: string }
