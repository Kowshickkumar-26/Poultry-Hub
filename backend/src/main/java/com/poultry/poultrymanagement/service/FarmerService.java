package com.poultry.poultrymanagement.service;

import com.poultry.poultrymanagement.dto.FarmerProfileUpdateRequest;
import com.poultry.poultrymanagement.dto.FarmerRequest;
import com.poultry.poultrymanagement.dto.FarmerResponse;
import com.poultry.poultrymanagement.entity.Batch;
import com.poultry.poultrymanagement.entity.BatchStatus;
import com.poultry.poultrymanagement.entity.DailyRecord;
import com.poultry.poultrymanagement.entity.Farm;
import com.poultry.poultrymanagement.entity.Farmer;
import com.poultry.poultrymanagement.entity.FeedStock;
import com.poultry.poultrymanagement.entity.Role;
import com.poultry.poultrymanagement.entity.User;
import com.poultry.poultrymanagement.repository.BatchRepository;
import com.poultry.poultrymanagement.repository.DailyRecordRepository;
import com.poultry.poultrymanagement.repository.FarmRepository;
import com.poultry.poultrymanagement.repository.FarmerRepository;
import com.poultry.poultrymanagement.repository.FeedStockRepository;
import com.poultry.poultrymanagement.repository.SaleRepository;
import com.poultry.poultrymanagement.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FarmerService {

    private final FarmerRepository farmerRepository;
    private final UserRepository userRepository;
    private final FarmRepository farmRepository;
    private final BatchRepository batchRepository;
    private final DailyRecordRepository dailyRecordRepository;
    private final FeedStockRepository feedStockRepository;
    private final SaleRepository saleRepository;

    @Transactional
    public FarmerResponse createFarmerProfile(FarmerRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + request.getUserId()));

        if (user.getRole() != Role.FARMER) {
            throw new IllegalArgumentException("User " + user.getId() + " does not have role FARMER");
        }

        if (farmerRepository.findByUserId(user.getId()).isPresent()) {
            throw new IllegalStateException("This user already has a farmer profile");
        }

        Farm farm = farmRepository.findById(request.getFarmId())
                .orElseThrow(() -> new EntityNotFoundException("Farm not found: " + request.getFarmId()));

        Farmer farmer = Farmer.builder()
                .user(user)
                .farm(farm)
                .build();

        return toEnrichedResponse(farmerRepository.save(farmer), false);
    }

    @Transactional(readOnly = true)
    public List<FarmerResponse> getAllFarmers() {
        return farmerRepository.findAll().stream()
                .map(farmer -> toEnrichedResponse(farmer, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FarmerResponse> getFarmersByFarm(Long farmId, Long loggedInUserId, Role role) {
        farmRepository.findById(farmId)
                .orElseThrow(() -> new EntityNotFoundException("Farm not found: " + farmId));

        return farmerRepository.findByFarmId(farmId).stream()
                .map(farmer -> toEnrichedResponse(farmer, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public FarmerResponse getFarmerByUserId(Long userId) {
        Farmer farmer = farmerRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("No farmer profile linked to this account"));
        return toEnrichedResponse(farmer, false);
    }

    @Transactional(readOnly = true)
    public FarmerResponse getFarmerDetailsById(Long farmerId) {
        Farmer farmer = farmerRepository.findById(farmerId)
                .orElseThrow(() -> new EntityNotFoundException("Farmer not found with ID: " + farmerId));
        return toEnrichedResponse(farmer, true);
    }

    @Transactional
    public FarmerResponse updateFarmerProfile(Long loggedInUserId, FarmerProfileUpdateRequest request) {
        Farmer farmer = farmerRepository.findByUserId(loggedInUserId)
                .orElseThrow(() -> new EntityNotFoundException("No farmer profile linked to this account"));

        User user = farmer.getUser();
        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            user.setName(request.getName().trim());
        }
        if (request.getPhone() != null) {
            String trimmedPhone = request.getPhone().trim();
            user.setPhone(trimmedPhone.isEmpty() ? null : trimmedPhone);
        }
        userRepository.save(user);

        Farm farm = farmer.getFarm();
        if (farm != null) {
            if (request.getFarmName() != null && !request.getFarmName().trim().isEmpty()) {
                farm.setName(request.getFarmName().trim());
            }
            if (request.getFarmLocation() != null) {
                String trimmedLoc = request.getFarmLocation().trim();
                farm.setLocation(trimmedLoc.isEmpty() ? null : trimmedLoc);
            }
            if (request.getFarmDescription() != null) {
                String trimmedDesc = request.getFarmDescription().trim();
                farm.setDescription(trimmedDesc.isEmpty() ? null : trimmedDesc);
            }
            farmRepository.save(farm);
        }

        return toEnrichedResponse(farmer, false);
    }

    private FarmerResponse toEnrichedResponse(Farmer farmer, boolean includeHistory) {
        Long farmerId = farmer.getId();
        List<Batch> allBatches = batchRepository.findByFarmerIdOrderByStartDateDesc(farmerId);

        List<Batch> activeBatches = allBatches.stream()
                .filter(b -> b.getStatus() == BatchStatus.ACTIVE)
                .toList();

        List<Batch> completedBatches = allBatches.stream()
                .filter(b -> b.getStatus() == BatchStatus.COMPLETED)
                .toList();

        Batch activeBatch = activeBatches.isEmpty() ? null : activeBatches.get(0);

        Integer initialBirds = null;
        Integer remainingBirds = null;
        Integer totalMortality = null;
        BigDecimal feedStockKg = BigDecimal.ZERO;

        if (activeBatch != null) {
            initialBirds = activeBatch.getInitialBirds();
            Optional<DailyRecord> latestRecord = dailyRecordRepository.findTopByBatchIdOrderByRecordDateDesc(activeBatch.getId());
            int totalMort = latestRecord.map(DailyRecord::getCumulativeMortality).orElse(0);
            int totalSold = saleRepository.findByBatchIdOrderBySaleDateAsc(activeBatch.getId()).stream()
                    .mapToInt(s -> s.getBirdsSold() != null ? s.getBirdsSold() : 0)
                    .sum();
            remainingBirds = Math.max(0, (initialBirds != null ? initialBirds : 0) - totalMort - totalSold);
            totalMortality = totalMort;
            feedStockKg = feedStockRepository.findByBatchId(activeBatch.getId())
                    .map(FeedStock::getCurrentStockKg)
                    .orElse(BigDecimal.ZERO);
        }

        List<FarmerResponse.BatchHistoryItem> batchHistory = Collections.emptyList();
        if (includeHistory) {
            batchHistory = allBatches.stream().map(batch -> {
                Optional<DailyRecord> lastRec = dailyRecordRepository.findTopByBatchIdOrderByRecordDateDesc(batch.getId());
                int totMort = lastRec.map(DailyRecord::getCumulativeMortality).orElse(0);
                int totSold = saleRepository.findByBatchIdOrderBySaleDateAsc(batch.getId()).stream()
                        .mapToInt(s -> s.getBirdsSold() != null ? s.getBirdsSold() : 0)
                        .sum();
                int finalRemaining = Math.max(0, (batch.getInitialBirds() != null ? batch.getInitialBirds() : 0) - totMort - totSold);

                return FarmerResponse.BatchHistoryItem.builder()
                        .id(batch.getId())
                        .batchCode(batch.getBatchCode())
                        .startDate(batch.getStartDate())
                        .endDate(batch.getEndDate())
                        .initialBirds(batch.getInitialBirds())
                        .finalRemainingBirds(finalRemaining)
                        .totalMortality(totMort)
                        .status(batch.getStatus())
                        .build();
            }).toList();
        }

        return FarmerResponse.builder()
                .id(farmer.getId())
                .userId(farmer.getUser().getId())
                .userName(farmer.getUser().getName())
                .userEmail(farmer.getUser().getEmail())
                .userPhone(farmer.getUser().getPhone())
                .joinedDate(farmer.getJoinedDate())
                .farmId(farmer.getFarm() != null ? farmer.getFarm().getId() : null)
                .farmName(farmer.getFarm() != null ? farmer.getFarm().getName() : null)
                .farmLocation(farmer.getFarm() != null ? farmer.getFarm().getLocation() : null)
                .farmDescription(farmer.getFarm() != null ? farmer.getFarm().getDescription() : null)
                .farmCreatedAt(farmer.getFarm() != null ? farmer.getFarm().getCreatedAt() : null)
                .activeBatchId(activeBatch != null ? activeBatch.getId() : null)
                .activeBatchCode(activeBatch != null ? activeBatch.getBatchCode() : null)
                .activeBatchStatus(activeBatch != null ? activeBatch.getStatus() : null)
                .activeBatchStartDate(activeBatch != null ? activeBatch.getStartDate() : null)
                .initialBirds(initialBirds)
                .remainingBirds(remainingBirds)
                .totalMortality(totalMortality)
                .feedStockKg(feedStockKg)
                .totalBatchesCount(allBatches.size())
                .completedBatchesCount(completedBatches.size())
                .batchHistory(batchHistory)
                .build();
    }
}
