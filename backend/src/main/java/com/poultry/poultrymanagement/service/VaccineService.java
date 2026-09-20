package com.poultry.poultrymanagement.service;

import com.poultry.poultrymanagement.dto.VaccineRequest;
import com.poultry.poultrymanagement.dto.VaccineResponse;
import com.poultry.poultrymanagement.entity.Batch;
import com.poultry.poultrymanagement.entity.BatchStatus;
import com.poultry.poultrymanagement.entity.Farmer;
import com.poultry.poultrymanagement.entity.Role;
import com.poultry.poultrymanagement.entity.Vaccine;
import com.poultry.poultrymanagement.repository.BatchRepository;
import com.poultry.poultrymanagement.repository.FarmerRepository;
import com.poultry.poultrymanagement.repository.VaccineRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VaccineService {

    private final VaccineRepository vaccineRepository;
    private final BatchRepository batchRepository;
    private final FarmerRepository farmerRepository;
    private final BatchService batchService;

    @Transactional
    public VaccineResponse addVaccine(Long batchId, VaccineRequest request, Long loggedInUserId) {
        Batch batch = getOwnedBatchOrThrow(batchId, loggedInUserId);

        if (batch.getStatus() == BatchStatus.COMPLETED) {
            throw new com.poultry.poultrymanagement.exception.BatchCompletedException("Cannot add vaccines. This batch is already completed.");
        }

        if (batch.getStatus() != BatchStatus.ACTIVE) {
            throw new IllegalStateException("Vaccines can only be added to an ACTIVE batch");
        }

        if (request.getVaccineName() == null || request.getVaccineName().trim().isEmpty()) {
            throw new IllegalArgumentException("Vaccine name is required");
        }

        LocalDate givenDate = request.getGivenDate() != null ? request.getGivenDate() : LocalDate.now();

        if (batch.getStartDate() != null && givenDate.isBefore(batch.getStartDate())) {
            throw new IllegalArgumentException("Vaccine date cannot be before the batch start date (" + batch.getStartDate() + ")");
        }

        int ageDays = 0;
        if (batch.getStartDate() != null) {
            ageDays = (int) ChronoUnit.DAYS.between(batch.getStartDate(), givenDate) + 1;
            if (ageDays < 1) ageDays = 1;
        }

        Vaccine vaccine = Vaccine.builder()
                .batch(batch)
                .givenDate(givenDate)
                .vaccineName(request.getVaccineName().trim())
                .ageDays(ageDays)
                .remarks(request.getRemarks() != null && !request.getRemarks().trim().isEmpty() ? request.getRemarks().trim() : null)
                .build();

        return toResponse(vaccineRepository.save(vaccine));
    }

    @Transactional(readOnly = true)
    public List<VaccineResponse> getVaccines(Long batchId, Long loggedInUserId, Role role) {
        batchService.getAccessibleBatch(batchId, loggedInUserId, role);
        return vaccineRepository.findByBatchIdOrderByGivenDateAsc(batchId).stream()
                .map(this::toResponse)
                .toList();
    }

    private Batch getOwnedBatchOrThrow(Long batchId, Long loggedInUserId) {
        Farmer farmer = farmerRepository.findByUserId(loggedInUserId)
                .orElseThrow(() -> new EntityNotFoundException("No farmer profile linked to this account"));

        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new EntityNotFoundException("Batch not found: " + batchId));

        if (!batch.getFarmer().getId().equals(farmer.getId())) {
            throw new AccessDeniedException("This batch does not belong to the logged-in farmer");
        }
        return batch;
    }

    private VaccineResponse toResponse(Vaccine vaccine) {
        return VaccineResponse.builder()
                .id(vaccine.getId())
                .batchId(vaccine.getBatch().getId())
                .givenDate(vaccine.getGivenDate())
                .vaccineName(vaccine.getVaccineName())
                .ageDays(vaccine.getAgeDays())
                .remarks(vaccine.getRemarks())
                .build();
    }
}
