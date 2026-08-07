import type { MaintenanceStatus } from '../model/maintenance'

export const SERVICE_STATUS_TONE: Record<MaintenanceStatus, string> = {
  pending: 'border border-[#FEEFC3] bg-[#FEF7E0] text-[#B06000]',
  in_progress: 'border border-[#D2E3FC] bg-[#E8F0FE] text-[#174EA6]',
  completed: 'border border-[#CEEAD6] bg-[#E6F4EA] text-[#137333]',
}

export const SERVICE_ROW_TONE: Record<MaintenanceStatus, string> = {
  pending: '',
  in_progress: 'bg-primary/3',
  completed: 'opacity-80',
}

