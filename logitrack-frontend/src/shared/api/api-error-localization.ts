type ApiErrorKey =
  | 'validationFailed'
  | 'malformedRequest'
  | 'invalidParameter'
  | 'dataConflict'
  | 'invalidCredentials'
  | 'loginRateLimit'
  | 'unauthorized'
  | 'accessDenied'
  | 'passwordChangeRequired'
  | 'resourceNotFound'
  | 'driverHasTrips'
  | 'licenseExists'
  | 'invalidDateFilter'
  | 'completedMaintenanceImmutable'
  | 'onlyPendingMaintenanceStarts'
  | 'vehicleAlreadyMaintenance'
  | 'onlyActiveMaintenanceFinishes'
  | 'onlyPendingMaintenanceDeletes'
  | 'maintenanceVehicleImmutable'
  | 'maintenanceStartImmutable'
  | 'maintenanceServicesImmutable'
  | 'invalidMaintenanceDates'
  | 'duplicateMaintenanceService'
  | 'vehicleInMaintenance'
  | 'vehicleInTrip'
  | 'maintenancePlanningBlocked'
  | 'inactiveMaintenanceService'
  | 'maintenanceServiceExists'
  | 'inactiveMaintenanceServiceExists'
  | 'newStageHasId'
  | 'activeTripNeedsDriver'
  | 'completedTripCannotStart'
  | 'tripAlreadyStarted'
  | 'assignDriverBeforeStart'
  | 'inactiveAssignedDriver'
  | 'tripAlreadyCompleted'
  | 'startBeforeFinish'
  | 'tripAlreadyCanceled'
  | 'completedTripCannotCancel'
  | 'routeScheduleOrder'
  | 'routeDistanceLimit'
  | 'duplicateRouteStage'
  | 'tripHasNoStages'
  | 'completedTripImmutable'
  | 'canceledTripImmutable'
  | 'driverAlreadyInTrip'
  | 'dashboardPeriod'
  | 'vehicleHasHistory'
  | 'plateExists'
  | 'activeTripsBeforeDelete'
  | 'stageBeforeDeparture'
  | 'stageNotInTrip'
  | 'requiredName'
  | 'requiredLicense'
  | 'invalidLicense'
  | 'requiredServiceName'
  | 'selectAtLeastOneVehicle'
  | 'deleteAtMostVehicles'
  | 'requiredPlate'
  | 'plateTooLong'
  | 'invalidPlate'
  | 'requiredModel'
  | 'modelTooLong'
  | 'selectVehicleType'
  | 'requiredYear'
  | 'invalidYear'
  | 'requiredMileage'
  | 'negativeMileage'
  | 'mileageOutOfRange'
  | 'requiredEmail'
  | 'invalidEmail'
  | 'requiredPassword'
  | 'requiredStageDestination'
  | 'requiredStageDistance'
  | 'positiveStageDistance'
  | 'stageDistanceOutOfRange'
  | 'requiredStageLoad'
  | 'negativeStageLoad'
  | 'stageLoadOutOfRange'
  | 'selectAtLeastOneTrip'
  | 'deleteAtMostTrips'
  | 'requiredDeparture'
  | 'requiredOrigin'
  | 'addRouteStage'
  | 'routeStageLimit'
  | 'selectMaintenanceService'
  | 'selectVehicle'
  | 'startTripBeforeStage'
  | 'stageAlreadyCompleted'
  | 'stageOrder'
  | 'assignDriverBeforeManifest'
  | 'duplicateInvoice'
  | 'completedTripCannotBeDeleted'
  | 'completedStageCannotBeRemoved'
  | 'completedStageCannotChange'
  | 'completeStageBeforeManifest'
  | 'stageAlreadyHasManifest'
  | 'requiredServiceCost'
  | 'negativeServiceCost'
  | 'serviceCostOutOfRange'
  | 'requiredMaintenanceStart'
  | 'requiredMaintenanceFinish'
  | 'addMaintenanceService'
  | 'maintenanceServiceLimit'

type ResolvedApiError = {
  key: ApiErrorKey
  values?: Record<string, string | number>
}

const BY_CODE: Record<string, ApiErrorKey> = {
  VALIDATION_ERROR: 'validationFailed',
  MALFORMED_REQUEST: 'malformedRequest',
  INVALID_PARAMETER: 'invalidParameter',
  DATA_CONFLICT: 'dataConflict',
  INVALID_CREDENTIALS: 'invalidCredentials',
  LOGIN_RATE_LIMIT_EXCEEDED: 'loginRateLimit',
  AUTHENTICATION_REQUIRED: 'unauthorized',
  ACCESS_DENIED: 'accessDenied',
  PASSWORD_CHANGE_REQUIRED: 'passwordChangeRequired',
}

export function resolveApiErrorCode(code: string): ResolvedApiError | undefined {
  const key = BY_CODE[code]
  return key ? { key } : undefined
}

const EXACT: Record<string, ApiErrorKey> = {
  'Falha de validacao nos campos enviados.': 'validationFailed',
  'E-mail ou senha invalidos.': 'invalidCredentials',
  'Token ausente ou invalido.': 'unauthorized',
  'Reatribua, cancele ou conclua as viagens nao encerradas antes de desativar o motorista.': 'driverHasTrips',
  'Ja existe um motorista cadastrado com esta CNH.': 'licenseExists',
  'A data final do filtro nao pode ser anterior a inicial.': 'invalidDateFilter',
  'Uma manutencao concluida nao pode ser alterada.': 'completedMaintenanceImmutable',
  'Somente uma manutencao pendente pode ser iniciada.': 'onlyPendingMaintenanceStarts',
  'O veiculo ja esta em manutencao.': 'vehicleAlreadyMaintenance',
  'Somente uma manutencao em realizacao pode ser concluida.': 'onlyActiveMaintenanceFinishes',
  'Somente uma manutencao pendente pode ser excluida.': 'onlyPendingMaintenanceDeletes',
  'O veiculo nao pode ser alterado durante a manutencao.': 'maintenanceVehicleImmutable',
  'A previsao de inicio nao pode ser alterada durante a manutencao.': 'maintenanceStartImmutable',
  'Os servicos nao podem ser alterados durante a manutencao.': 'maintenanceServicesImmutable',
  'A finalizacao prevista nao pode ser anterior ao inicio previsto.': 'invalidMaintenanceDates',
  'O mesmo servico foi informado mais de uma vez.': 'duplicateMaintenanceService',
  'O veiculo esta em manutencao.': 'vehicleInMaintenance',
  'O veiculo esta em uma viagem em andamento.': 'vehicleInTrip',
  'O veiculo ja esta em uma viagem em andamento.': 'vehicleInTrip',
  'Veiculos em manutencao nao podem receber um novo agendamento.': 'maintenancePlanningBlocked',
  'O servico de manutencao selecionado esta inativo.': 'inactiveMaintenanceService',
  'Ja existe um servico de manutencao com este nome.': 'maintenanceServiceExists',
  'Ja existe um servico inativo com este nome; reative-o.': 'inactiveMaintenanceServiceExists',
  'Trechos novos nao podem informar id.': 'newStageHasId',
  'Uma viagem em andamento deve possuir motorista.': 'activeTripNeedsDriver',
  'Uma viagem concluida nao pode ser iniciada.': 'completedTripCannotStart',
  'A viagem ja esta em andamento.': 'tripAlreadyStarted',
  'Atribua um motorista antes de iniciar a viagem.': 'assignDriverBeforeStart',
  'O motorista atribuido esta inativo.': 'inactiveAssignedDriver',
  'A viagem ja esta concluida.': 'tripAlreadyCompleted',
  'Inicie a viagem antes de conclui-la.': 'startBeforeFinish',
  'A viagem ja esta cancelada.': 'tripAlreadyCanceled',
  'Uma viagem concluida nao pode ser cancelada.': 'completedTripCannotCancel',
  'As previsoes dos trechos devem seguir a ordem da rota.': 'routeScheduleOrder',
  'A quilometragem total da rota excede o limite permitido.': 'routeDistanceLimit',
  'O mesmo trecho foi informado mais de uma vez.': 'duplicateRouteStage',
  'A viagem nao possui trechos para concluir.': 'tripHasNoStages',
  'Uma viagem concluida nao pode ser alterada.': 'completedTripImmutable',
  'Uma viagem cancelada nao pode ser alterada.': 'canceledTripImmutable',
  'O motorista ja esta em uma viagem em andamento.': 'driverAlreadyInTrip',
  'O periodo do dashboard deve ser de 7 ou 30 dias.': 'dashboardPeriod',
  'Informe o nome.': 'requiredName',
  'Informe a CNH.': 'requiredLicense',
  'A CNH deve conter exatamente 11 digitos.': 'invalidLicense',
  'Informe o nome do servico.': 'requiredServiceName',
  'Selecione ao menos um veiculo.': 'selectAtLeastOneVehicle',
  'Exclua no maximo 100 veiculos por vez.': 'deleteAtMostVehicles',
  'Informe a placa.': 'requiredPlate',
  'A placa deve ter no maximo 10 caracteres.': 'plateTooLong',
  'Placa invalida. Use o formato ABC-1234 ou ABC1D23.': 'invalidPlate',
  'Informe o modelo.': 'requiredModel',
  'O modelo deve ter no maximo 50 caracteres.': 'modelTooLong',
  'Selecione o tipo do veiculo.': 'selectVehicleType',
  'Informe o ano.': 'requiredYear',
  'Ano invalido.': 'invalidYear',
  'Informe a quilometragem. Use 0 para veiculo zero-quilometro.': 'requiredMileage',
  'A quilometragem nao pode ser negativa.': 'negativeMileage',
  'Quilometragem fora do intervalo permitido.': 'mileageOutOfRange',
  'Informe o e-mail.': 'requiredEmail',
  'E-mail invalido.': 'invalidEmail',
  'Informe a senha.': 'requiredPassword',
  'Informe o destino do trecho.': 'requiredStageDestination',
  'Informe a quilometragem do trecho.': 'requiredStageDistance',
  'A quilometragem do trecho deve ser maior que zero.': 'positiveStageDistance',
  'Quilometragem do trecho fora do intervalo permitido.': 'stageDistanceOutOfRange',
  'Informe a carga do trecho.': 'requiredStageLoad',
  'A carga do trecho nao pode ser negativa.': 'negativeStageLoad',
  'Carga do trecho fora do intervalo permitido.': 'stageLoadOutOfRange',
  'Selecione ao menos uma viagem.': 'selectAtLeastOneTrip',
  'Exclua no maximo 100 viagens por vez.': 'deleteAtMostTrips',
  'Informe a data e hora de saida.': 'requiredDeparture',
  'Informe a cidade de origem.': 'requiredOrigin',
  'Adicione ao menos um trecho a rota.': 'addRouteStage',
  'Uma viagem pode ter no maximo 30 trechos.': 'routeStageLimit',
  'Selecione o servico.': 'selectMaintenanceService',
  // @NotNull de TripRequest.veiculoId e MaintenanceRequest.veiculoId. Faltava
  // mapeamento: em ingles a mensagem caia no generico "Check this field.".
  'Selecione um veiculo.': 'selectVehicle',
  // Conclusao trecho a trecho (V13).
  'Inicie a viagem antes de concluir um trecho.': 'startTripBeforeStage',
  'Este trecho ja foi concluido.': 'stageAlreadyCompleted',
  'Conclua os trechos na ordem da rota.': 'stageOrder',
  // Romaneio de carga, agora por trecho (V14/V15).
  'Atribua um motorista antes de emitir o romaneio.': 'assignDriverBeforeManifest',
  'A mesma nota fiscal foi informada mais de uma vez.': 'duplicateInvoice',
  'Conclua o trecho antes de emitir o romaneio.': 'completeStageBeforeManifest',
  'Este trecho ja possui romaneio emitido.': 'stageAlreadyHasManifest',
  'Informe o custo do servico.': 'requiredServiceCost',
  'O custo nao pode ser negativo.': 'negativeServiceCost',
  'O custo deve ter no maximo 8 inteiros e 2 decimais.': 'serviceCostOutOfRange',
  'Informe a data prevista de inicio.': 'requiredMaintenanceStart',
  'Informe a data prevista de finalizacao.': 'requiredMaintenanceFinish',
  'Adicione pelo menos um servico.': 'addMaintenanceService',
  'Uma manutencao pode ter no maximo 30 servicos.': 'maintenanceServiceLimit',
}

export function resolveApiError(message: string): ResolvedApiError | undefined {
  const exact = EXACT[message]
  if (exact) return { key: exact }

  let match = /^.+ de id (\d+) nao encontrado\.$/.exec(message)
  if (match) return { key: 'resourceNotFound', values: { id: match[1] } }

  match = /^Nao e possivel excluir veiculo com viagens ou manutencoes: (.+)\.$/.exec(message)
  if (match) return { key: 'vehicleHasHistory', values: { plates: match[1] } }

  match = /^Ja existe um veiculo cadastrado com a placa (.+)\.$/.exec(message)
  if (match) return { key: 'plateExists', values: { plate: match[1] } }

  match = /^Cancele ou conclua as viagens em andamento antes de excluir: (.+)\.$/.exec(message)
  if (match) return { key: 'activeTripsBeforeDelete', values: { ids: match[1] } }

  match = /^A previsao do trecho (\d+) nao pode ser anterior a partida\.$/.exec(message)
  if (match) return { key: 'stageBeforeDeparture', values: { number: match[1] } }

  match = /^O trecho (\d+) nao pertence a esta viagem\.$/.exec(message)
  if (match) return { key: 'stageNotInTrip', values: { id: match[1] } }

  // Historico concluido e imutavel: nao se exclui viagem nem se mexe em trecho ja realizado.
  match = /^Viagens concluidas nao podem ser excluidas: (.+)\.$/.exec(message)
  if (match) return { key: 'completedTripCannotBeDeleted', values: { ids: match[1] } }

  match = /^O trecho (\d+) ja foi concluido e nao pode ser removido\.$/.exec(message)
  if (match) return { key: 'completedStageCannotBeRemoved', values: { id: match[1] } }

  match = /^O trecho (\d+) ja foi concluido e nao pode ser alterado\.$/.exec(message)
  if (match) return { key: 'completedStageCannotChange', values: { id: match[1] } }

  return undefined
}
