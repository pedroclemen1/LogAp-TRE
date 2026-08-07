export type MaintenanceFormState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: Record<string, string>
}

export const EMPTY_MAINTENANCE_FORM_STATE: MaintenanceFormState = { status: 'idle' }

