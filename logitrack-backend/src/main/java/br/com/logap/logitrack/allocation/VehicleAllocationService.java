package br.com.logap.logitrack.allocation;

import org.springframework.stereotype.Service;

import br.com.logap.logitrack.maintenance.MaintenanceRepository;
import br.com.logap.logitrack.shared.BusinessRuleException;
import br.com.logap.logitrack.shared.ResourceNotFoundException;
import br.com.logap.logitrack.trip.TripRepository;
import br.com.logap.logitrack.vehicle.Vehicle;
import br.com.logap.logitrack.vehicle.VehicleRepository;

@Service
public class VehicleAllocationService {

    private final VehicleRepository vehicleRepository;
    private final TripRepository tripRepository;
    private final MaintenanceRepository maintenanceRepository;

    public VehicleAllocationService(VehicleRepository vehicleRepository,
                                    TripRepository tripRepository,
                                    MaintenanceRepository maintenanceRepository) {
        this.vehicleRepository = vehicleRepository;
        this.tripRepository = tripRepository;
        this.maintenanceRepository = maintenanceRepository;
    }

    public Vehicle reserveForTrip(Integer vehicleId, Integer tripId) {
        Vehicle vehicle = lockVehicle(vehicleId);
        if (maintenanceRepository.existsActiveVehicle(vehicleId, 0)) {
            throw new BusinessRuleException("O veiculo esta em manutencao.");
        }
        if (tripRepository.existsActiveVehicle(vehicleId, tripId)) {
            throw new BusinessRuleException("O veiculo ja esta em uma viagem em andamento.");
        }
        return vehicle;
    }

    public Vehicle reserveForMaintenance(Integer vehicleId, Integer maintenanceId) {
        Vehicle vehicle = lockVehicle(vehicleId);
        if (tripRepository.existsActiveVehicle(vehicleId, 0)) {
            throw new BusinessRuleException("O veiculo esta em uma viagem em andamento.");
        }
        if (maintenanceRepository.existsActiveVehicle(vehicleId, maintenanceId)) {
            throw new BusinessRuleException("O veiculo ja esta em manutencao.");
        }
        return vehicle;
    }

    public void ensureAvailableForPlanning(Integer vehicleId, Integer maintenanceId) {
        if (maintenanceRepository.existsActiveVehicle(vehicleId, maintenanceId)) {
            throw new BusinessRuleException("Veiculos em manutencao nao podem receber um novo agendamento.");
        }
    }

    private Vehicle lockVehicle(Integer vehicleId) {
        return vehicleRepository.findByIdForUpdate(vehicleId)
            .orElseThrow(() -> new ResourceNotFoundException("Veiculo", vehicleId));
    }
}
