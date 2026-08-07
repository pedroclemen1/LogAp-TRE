export type DriverDto = {
  id: number
  nome: string
  cnh: string
  telefone?: string
  ativo: boolean
  statusOperacional: 'LIVRE' | 'EM_USO'
}

export type MaintenanceServiceDto = {
  id: number
  nome: string
  ativo: boolean
}
