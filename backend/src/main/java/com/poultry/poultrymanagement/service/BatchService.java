package com.poultry.poultrymanagement.service;

import com.poultry.poultrymanagement.dto.BatchRequest;
import com.poultry.poultrymanagement.dto.BatchResponse;
import com.poultry.poultrymanagement.entity.*;
import com.poultry.poultrymanagement.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.poultry.poultrymanagement.exception.BatchCompletedException;
import com.poultry.poultrymanagement.exception.BatchEndingRemainingBirdsException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BatchService {

    private final BatchRepository batchRepository;
    private final FarmRepository farmRepository;
    private final FarmerRepository farmerRepository;
    private final FeedStockRepository feedStockRepository;
    private final DailyRecordRepository dailyRecordRepository;
    private final SaleRepository saleRepository;

    @Transactional
    public BatchResponse createBatch(BatchRequest request, Long loggedInUserId) {
        Farmer farmer = farmerRepository.findByUserId(loggedInUserId)
                .orElseThrow(() -> new EntityNotFoundException("No farmer profile linked to this account"));

        Farm farm = farmRepository.findById(request.getFarmId())
                .orElseThrow(() -> new EntityNotFoundException("Farm not found: " + request.getFarmId()));

        if (!farmer.getFarm().getId().equals(farm.getId())) {
            throw new AccessDeniedException("Cannot create batch for a farm that does not belong to this farmer");
        }

        boolean hasActiveBatch = batchRepository.findByFarmerIdAndStatus(farmer.getId(), BatchStatus.ACTIVE).stream().findAny().isPresent();
        if (hasActiveBatch) {
            throw new IllegalStateException("Farmer already has an active batch. End it before creating a new one.");
        }

        LocalDate today = LocalDate.now();
        Batch batch = Batch.builder()
                .batchCode(generateBatchCode())
                .farm(farm)
                .farmer(farmer)
                .startDate(today)
                .initialBirds(request.getInitialBirds())
                .status(BatchStatus.ACTIVE)
                .build();
        Batch saved = batchRepository.save(batch);

        FeedStock stock = FeedStock.builder()
                .batch(saved)
                .currentBags(BigDecimal.ZERO)
                .currentStockKg(BigDecimal.ZERO)
                .build();
        feedStockRepository.save(stock);

        return toResponse(saved);
    }

    @Transactional
    public BatchResponse endBatch(Long batchId, Long loggedInUserId) {
        Batch batch = getOwnedBatchOrThrow(batchId, loggedInUserId);

        if (batch.getStatus() == BatchStatus.COMPLETED) {
            throw new BatchCompletedException("Cannot end batch. This batch is already completed.");
        }

        if (batch.getStatus() != BatchStatus.ACTIVE) {
            throw new IllegalStateException("Only ACTIVE batches can be ended. Current status: " + batch.getStatus());
        }

        LocalDate today = LocalDate.now();

        if (batch.getStartDate() == null) {
            throw new IllegalStateException("Batch start date is missing");
        }

        if (today.isBefore(batch.getStartDate())) {
            throw new IllegalStateException(
                    "Cannot end batch before its start date. " +
                    "Start date: " + batch.getStartDate() +
                    ", current date: " + today
            );
        }

        // Authoritative remaining birds calculation
        int initialBirds = batch.getInitialBirds() != null ? batch.getInitialBirds() : 0;
        int totalMortality = dailyRecordRepository.findByBatchIdOrderByRecordDateAsc(batchId).stream()
                .mapToInt(r -> r.getMortality() != null ? r.getMortality() : 0)
                .sum();
        int totalBirdsSold = saleRepository.findByBatchIdOrderBySaleDateAsc(batchId).stream()
                .mapToInt(s -> s.getBirdsSold() != null ? s.getBirdsSold() : 0)
                .sum();

        int remainingBirds = Math.max(0, initialBirds - totalMortality - totalBirdsSold);

        if (remainingBirds > 0) {
            throw new BatchEndingRemainingBirdsException(
                    String.format("Cannot end batch. There are still %d birds remaining. Sell or record mortality for all remaining birds before ending the batch.", remainingBirds)
            );
        }

        batch.setEndDate(today);
        batch.setStatus(BatchStatus.COMPLETED);

        return toResponse(batchRepository.save(batch));
    }

    @Transactional(readOnly = true)
    public BatchResponse getActiveBatch(Long loggedInUserId) {
        Farmer farmer = farmerRepository.findByUserId(loggedInUserId)
                .orElseThrow(() -> new EntityNotFoundException("No farmer profile linked to this account"));

        return batchRepository.findByFarmerIdAndStatus(farmer.getId(), BatchStatus.ACTIVE).stream()
                .sorted((a, b) -> b.getStartDate().compareTo(a.getStartDate()))
                .findFirst()
                .map(this::toResponse)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<BatchResponse> getBatchHistory(Long loggedInUserId) {
        Farmer farmer = farmerRepository.findByUserId(loggedInUserId)
                .orElseThrow(() -> new EntityNotFoundException("No farmer profile linked to this account"));

        return batchRepository.findByFarmerIdOrderByStartDateDesc(farmer.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BatchResponse> getAllActiveBatches() {
        return batchRepository.findByStatus(BatchStatus.ACTIVE).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BatchResponse> getAllCompletedBatches() {
        return batchRepository.findByStatus(BatchStatus.COMPLETED).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public BatchResponse getBatchById(Long id, Long loggedInUserId, Role role) {
        return toResponse(getAccessibleBatch(id, loggedInUserId, role));
    }

    @Transactional(readOnly = true)
    public Batch getAccessibleBatch(Long batchId, Long loggedInUserId, Role role) {
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new EntityNotFoundException("Batch not found: " + batchId));

        if (role == Role.FARMER) {
            Farmer farmer = farmerRepository.findByUserId(loggedInUserId)
                    .orElseThrow(() -> new EntityNotFoundException("No farmer profile linked to this account"));
            if (!batch.getFarmer().getId().equals(farmer.getId())) {
                throw new AccessDeniedException("This batch does not belong to the logged-in farmer");
            }
        }
        return batch;
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

    private synchronized String generateBatchCode() {
        long count = batchRepository.count();
        long nextNum = count + 1;
        String code;
        do {
            code = String.format("BATCH-%02d", nextNum);
            nextNum++;
        } while (batchRepository.findByBatchCode(code).isPresent());
        return code;
    }

    private BatchResponse toResponse(Batch batch) {
        return BatchResponse.builder()
                .id(batch.getId())
                .batchCode(batch.getBatchCode())
                .farmId(batch.getFarm().getId())
                .farmName(batch.getFarm().getName())
                .farmerId(batch.getFarmer().getId())
                .farmerName(batch.getFarmer().getUser().getName())
                .startDate(batch.getStartDate())
                .endDate(batch.getEndDate())
                .initialBirds(batch.getInitialBirds())
                .status(batch.getStatus())
                .build();
    }
}
