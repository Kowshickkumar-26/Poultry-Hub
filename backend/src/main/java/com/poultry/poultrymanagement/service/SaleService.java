package com.poultry.poultrymanagement.service;

import com.poultry.poultrymanagement.dto.SaleRequest;
import com.poultry.poultrymanagement.dto.SaleResponse;
import com.poultry.poultrymanagement.entity.Batch;
import com.poultry.poultrymanagement.entity.BatchStatus;
import com.poultry.poultrymanagement.entity.Farmer;
import com.poultry.poultrymanagement.entity.Role;
import com.poultry.poultrymanagement.entity.Sale;
import com.poultry.poultrymanagement.repository.BatchRepository;
import com.poultry.poultrymanagement.repository.DailyRecordRepository;
import com.poultry.poultrymanagement.repository.FarmerRepository;
import com.poultry.poultrymanagement.repository.SaleRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SaleService {

    private final SaleRepository saleRepository;
    private final BatchRepository batchRepository;
    private final FarmerRepository farmerRepository;
    private final DailyRecordRepository dailyRecordRepository;
    private final BatchService batchService;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public SaleResponse addSale(Long batchId, SaleRequest request, Long loggedInUserId) {
        Batch batch = getOwnedBatchOrThrow(batchId, loggedInUserId);

        if (batch.getStatus() == BatchStatus.COMPLETED) {
            throw new com.poultry.poultrymanagement.exception.BatchCompletedException("Cannot add sales. This batch is already completed.");
        }

        if (batch.getStatus() != BatchStatus.ACTIVE) {
            throw new IllegalStateException("Sales can only be added to an ACTIVE batch. This batch is " + batch.getStatus());
        }

        if (request.getBirdsSold() == null || request.getBirdsSold() <= 0) {
            throw new IllegalArgumentException("Birds sold must be greater than zero");
        }

        if (request.getTotalWeightKg() == null || request.getTotalWeightKg().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Total weight must be greater than zero");
        }

        if (request.getRatePerKg() == null || request.getRatePerKg().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Rate per kg must be greater than zero");
        }

        if (batch.getStartDate() != null && request.getSaleDate() != null && request.getSaleDate().isBefore(batch.getStartDate())) {
            throw new IllegalArgumentException("Sale date cannot be before the batch start date");
        }

        int initialBirds = batch.getInitialBirds() != null ? batch.getInitialBirds() : 0;
        int totalMortality = dailyRecordRepository.findByBatchIdOrderByRecordDateAsc(batchId).stream()
                .mapToInt(r -> r.getMortality() != null ? r.getMortality() : 0)
                .sum();
        int previousSales = saleRepository.findByBatchIdOrderBySaleDateAsc(batchId).stream()
                .mapToInt(s -> s.getBirdsSold() != null ? s.getBirdsSold() : 0)
                .sum();

        int remainingBirds = Math.max(0, initialBirds - totalMortality - previousSales);

        if (request.getBirdsSold() > remainingBirds) {
            throw new com.poultry.poultrymanagement.exception.InvalidSaleException(
                    "Cannot sell " + request.getBirdsSold() + " birds. Only " + remainingBirds + " birds are currently available in this batch."
            );
        }

        Sale sale = Sale.builder()
                .batch(batch)
                .saleDate(request.getSaleDate())
                .traderName(request.getTraderName())
                .birdsSold(request.getBirdsSold())
                .totalWeightKg(request.getTotalWeightKg())
                .ratePerKg(request.getRatePerKg())
                .liftingSignature(request.getLiftingSignature())
                .build();

        Sale saved = saleRepository.save(sale);

        int newTotalSold = previousSales + sale.getBirdsSold();
        List<com.poultry.poultrymanagement.entity.DailyRecord> records = dailyRecordRepository.findByBatchIdOrderByRecordDateAsc(batchId);
        for (com.poultry.poultrymanagement.entity.DailyRecord r : records) {
            int rMortality = r.getCumulativeMortality() != null ? r.getCumulativeMortality() : 0;
            r.setRemainingBirds(Math.max(0, initialBirds - rMortality - newTotalSold));
            dailyRecordRepository.save(r);
        }

        entityManager.flush();
        entityManager.refresh(saved);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<SaleResponse> getSales(Long batchId, Long loggedInUserId, Role role) {
        batchService.getAccessibleBatch(batchId, loggedInUserId, role);
        return saleRepository.findByBatchIdOrderBySaleDateAsc(batchId).stream()
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

    private SaleResponse toResponse(Sale sale) {
        return SaleResponse.builder()
                .id(sale.getId())
                .batchId(sale.getBatch().getId())
                .saleDate(sale.getSaleDate())
                .traderName(sale.getTraderName())
                .birdsSold(sale.getBirdsSold())
                .totalWeightKg(sale.getTotalWeightKg())
                .avgWeightPerBirdKg(sale.getAvgWeightPerBirdKg())
                .ratePerKg(sale.getRatePerKg())
                .liftingSignature(sale.getLiftingSignature())
                .revenue(sale.getRevenue())
                .createdAt(sale.getCreatedAt())
                .build();
    }
}
