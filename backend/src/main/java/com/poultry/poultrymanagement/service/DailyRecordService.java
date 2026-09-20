package com.poultry.poultrymanagement.service;

import com.poultry.poultrymanagement.dto.DailyRecordRequest;
import com.poultry.poultrymanagement.dto.DailyRecordResponse;
import com.poultry.poultrymanagement.entity.Batch;
import com.poultry.poultrymanagement.entity.BatchStatus;
import com.poultry.poultrymanagement.entity.DailyRecord;
import com.poultry.poultrymanagement.entity.Farmer;
import com.poultry.poultrymanagement.entity.Role;
import com.poultry.poultrymanagement.exception.InsufficientFeedStockException;
import com.poultry.poultrymanagement.exception.InvalidMortalityException;
import com.poultry.poultrymanagement.repository.BatchRepository;
import com.poultry.poultrymanagement.repository.DailyRecordRepository;
import com.poultry.poultrymanagement.repository.FarmerRepository;
import com.poultry.poultrymanagement.repository.FeedLoadRepository;
import com.poultry.poultrymanagement.repository.SaleRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DailyRecordService {

    private final DailyRecordRepository dailyRecordRepository;
    private final FeedLoadRepository feedLoadRepository;
    private final BatchRepository batchRepository;
    private final FarmerRepository farmerRepository;
    private final SaleRepository saleRepository;
    private final BatchService batchService;
    private final FeedLoadService feedLoadService;

    private static final BigDecimal CHICK_WEIGHT_G = BigDecimal.valueOf(40);
    private static final BigDecimal DEFAULT_BAG_WEIGHT_KG = BigDecimal.valueOf(50);

    @Transactional
    public DailyRecordResponse addDailyRecord(Long batchId, DailyRecordRequest request, Long loggedInUserId) {
        Batch batch = getOwnedBatchOrThrow(batchId, loggedInUserId);

        if (batch.getStatus() == BatchStatus.COMPLETED) {
            throw new com.poultry.poultrymanagement.exception.BatchCompletedException("Cannot add daily records. This batch is already completed.");
        }

        if (batch.getStatus() != BatchStatus.ACTIVE) {
            throw new IllegalStateException("Daily records can only be added to an ACTIVE batch. This batch is " + batch.getStatus());
        }
        if (batch.getStartDate() == null) {
            throw new IllegalStateException("Batch start date is missing");
        }

        LocalDate recordDate = request.getRecordDate() != null ? request.getRecordDate() : LocalDate.now();

        if (recordDate.isBefore(batch.getStartDate())) {
            throw new IllegalArgumentException("Record date cannot be before the batch start date (" + batch.getStartDate() + ")");
        }
        if (recordDate.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("Record date cannot be in the future");
        }
        if (dailyRecordRepository.findByBatchIdAndRecordDate(batchId, recordDate).isPresent()) {
            throw new IllegalStateException("A daily record for this batch and date (" + recordDate + ") already exists");
        }

        Optional<DailyRecord> previous = dailyRecordRepository.findTopByBatchIdOrderByRecordDateDesc(batchId);
        int previousCumulativeMortality = previous.map(DailyRecord::getCumulativeMortality).orElse(0);

        int totalBirdsSold = saleRepository.findByBatchIdOrderBySaleDateAsc(batchId).stream()
                .mapToInt(s -> s.getBirdsSold() != null ? s.getBirdsSold() : 0)
                .sum();
        int currentLiveBirdsBeforeToday = Math.max(0, batch.getInitialBirds() - previousCumulativeMortality - totalBirdsSold);

        int mortality = request.getMortality() != null ? request.getMortality() : 0;
        if (mortality < 0) {
            throw new IllegalArgumentException("Mortality cannot be negative");
        }
        if (mortality > currentLiveBirdsBeforeToday) {
            throw new InvalidMortalityException("Today's mortality (" + mortality + ") cannot exceed current live bird count (" + currentLiveBirdsBeforeToday + ")");
        }

        int morningMortality = request.getMorningMortality() != null ? request.getMorningMortality() : 0;
        int cumulativeMortality = previousCumulativeMortality + mortality;
        int remainingBirds = Math.max(0, batch.getInitialBirds() - cumulativeMortality - totalBirdsSold);

        BigDecimal cumulativeMortalityPct = BigDecimal.ZERO;
        if (batch.getInitialBirds() > 0) {
            cumulativeMortalityPct = BigDecimal.valueOf(cumulativeMortality)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(batch.getInitialBirds()), 2, RoundingMode.HALF_UP);
        }

        // Feed Calculation
        String rawFeedType = request.getFeedType();
        BigDecimal rawBagCapacity = request.getBagCapacityKg();

        if ((rawFeedType == null || rawFeedType.trim().isEmpty()) || rawBagCapacity == null) {
            var recentLoads = feedLoadRepository.findByBatchIdOrderByLoadDateAsc(batchId);
            if (!recentLoads.isEmpty()) {
                var latestLoad = recentLoads.get(recentLoads.size() - 1);
                if (rawFeedType == null || rawFeedType.trim().isEmpty()) {
                    rawFeedType = latestLoad.getFeedType();
                }
                if (rawBagCapacity == null && latestLoad.getWeightPerBagKg() != null) {
                    rawBagCapacity = latestLoad.getWeightPerBagKg();
                }
            }
        }

        BigDecimal bagCapacityKg = rawBagCapacity != null && rawBagCapacity.compareTo(BigDecimal.ZERO) > 0
                ? rawBagCapacity
                : DEFAULT_BAG_WEIGHT_KG;

        String normalizedFeedType = FeedLoadService.normalizeFeedType(rawFeedType);
        String displayFeedType = FeedLoadService.formatFeedTypeDisplay(normalizedFeedType);

        BigDecimal feedBagsConsumed = request.getFeedBagsConsumed() != null ? request.getFeedBagsConsumed() : BigDecimal.ZERO;
        BigDecimal todaysFeedKg = BigDecimal.ZERO;

        if (request.getFeedConsumedKg() != null && request.getFeedConsumedKg().compareTo(BigDecimal.ZERO) > 0
                && feedBagsConsumed.compareTo(BigDecimal.ZERO) == 0) {
            todaysFeedKg = request.getFeedConsumedKg();
            feedBagsConsumed = todaysFeedKg.divide(bagCapacityKg, 2, RoundingMode.HALF_UP);
        } else {
            todaysFeedKg = feedBagsConsumed.multiply(bagCapacityKg);
        }

        // Capacity-Aware Bag Stock Validation
        if (feedBagsConsumed.compareTo(BigDecimal.ZERO) > 0) {
            validateFeedCapacityStock(batchId, null, normalizedFeedType, displayFeedType, bagCapacityKg, feedBagsConsumed);
        }

        List<DailyRecord> existingRecords = dailyRecordRepository.findByBatchIdOrderByRecordDateAsc(batchId);
        BigDecimal previousConsumedKg = existingRecords.stream()
                .map(r -> r.getFeedConsumedKg() != null ? r.getFeedConsumedKg() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal cumulativeFeedKg = previousConsumedKg.add(todaysFeedKg);
        BigDecimal fcr = calculateFcr(cumulativeFeedKg, request.getAvgWeightG(), remainingBirds, batch.getInitialBirds());

        DailyRecord record = DailyRecord.builder()
                .batch(batch)
                .recordDate(recordDate)
                .morningMortality(morningMortality)
                .mortality(mortality)
                .cumulativeMortality(cumulativeMortality)
                .cumulativeMortalityPct(cumulativeMortalityPct)
                .remainingBirds(remainingBirds)
                .feedType(displayFeedType)
                .bagCapacityKg(bagCapacityKg)
                .feedBagsConsumed(feedBagsConsumed)
                .feedConsumedKg(todaysFeedKg)
                .minFeedIntakeG(request.getMinFeedIntakeG())
                .cumulativeFeedMinKg(request.getCumulativeFeedMinKg())
                .cumulativeFeedActualKg(request.getCumulativeFeedActualKg() != null ? request.getCumulativeFeedActualKg() : cumulativeFeedKg)
                .minBodyWeightG(request.getMinBodyWeightG())
                .avgWeightG(request.getAvgWeightG())
                .standardFcr(request.getStandardFcr())
                .fcr(fcr)
                .feedBagsTotal(request.getFeedBagsTotal())
                .feedBagsClosingStock(request.getFeedBagsClosingStock())
                .signature(request.getSignature())
                .notes(request.getNotes())
                .build();

        DailyRecord saved = dailyRecordRepository.save(record);

        feedLoadService.syncFeedStock(batchId);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<DailyRecordResponse> getDailyRecords(Long batchId, Long loggedInUserId, Role role) {
        batchService.getAccessibleBatch(batchId, loggedInUserId, role);
        return dailyRecordRepository.findByBatchIdOrderByRecordDateAsc(batchId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public DailyRecordResponse updateDailyRecord(Long batchId, Long dailyRecordId, DailyRecordRequest request, Long loggedInUserId) {
        Batch batch = getOwnedBatchOrThrow(batchId, loggedInUserId);
        DailyRecord record = dailyRecordRepository.findById(dailyRecordId)
                .orElseThrow(() -> new EntityNotFoundException("Daily record not found: " + dailyRecordId));

        if (!record.getBatch().getId().equals(batchId)) {
            throw new IllegalArgumentException("This daily record does not belong to the selected batch");
        }
        if (batch.getStatus() == BatchStatus.COMPLETED) {
            throw new com.poultry.poultrymanagement.exception.BatchCompletedException("Cannot update daily records. This batch is already completed.");
        }
        if (batch.getStatus() != BatchStatus.ACTIVE) {
            throw new IllegalStateException("Daily records can only be updated on an ACTIVE batch");
        }

        LocalDate recordDate = request.getRecordDate() != null ? request.getRecordDate() : record.getRecordDate();

        if (recordDate.isBefore(batch.getStartDate())) {
            throw new IllegalArgumentException("Record date cannot be before the batch start date");
        }
        if (recordDate.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("Record date cannot be in the future");
        }

        if (!record.getRecordDate().equals(recordDate)
                && dailyRecordRepository.findByBatchIdAndRecordDate(batchId, recordDate).isPresent()) {
            throw new IllegalStateException("A daily record for this batch and date already exists");
        }

        BigDecimal bagCapacityKg = request.getBagCapacityKg() != null && request.getBagCapacityKg().compareTo(BigDecimal.ZERO) > 0
                ? request.getBagCapacityKg()
                : (record.getBagCapacityKg() != null ? record.getBagCapacityKg() : DEFAULT_BAG_WEIGHT_KG);

        String normalizedFeedType = FeedLoadService.normalizeFeedType(request.getFeedType() != null ? request.getFeedType() : record.getFeedType());
        String displayFeedType = FeedLoadService.formatFeedTypeDisplay(normalizedFeedType);

        BigDecimal feedBagsConsumed = request.getFeedBagsConsumed() != null ? request.getFeedBagsConsumed() : BigDecimal.ZERO;
        BigDecimal todaysFeedKg = BigDecimal.ZERO;
        if (request.getFeedConsumedKg() != null && request.getFeedConsumedKg().compareTo(BigDecimal.ZERO) > 0
                && feedBagsConsumed.compareTo(BigDecimal.ZERO) == 0) {
            todaysFeedKg = request.getFeedConsumedKg();
            feedBagsConsumed = todaysFeedKg.divide(bagCapacityKg, 2, RoundingMode.HALF_UP);
        } else {
            todaysFeedKg = feedBagsConsumed.multiply(bagCapacityKg);
        }

        if (feedBagsConsumed.compareTo(BigDecimal.ZERO) > 0) {
            validateFeedCapacityStock(batchId, dailyRecordId, normalizedFeedType, displayFeedType, bagCapacityKg, feedBagsConsumed);
        }

        List<DailyRecord> existingRecords = dailyRecordRepository.findByBatchIdOrderByRecordDateAsc(batchId);
        int totalBirdsSold = saleRepository.findByBatchIdOrderBySaleDateAsc(batchId).stream()
                .mapToInt(s -> s.getBirdsSold() != null ? s.getBirdsSold() : 0)
                .sum();

        int otherRecordsMortality = existingRecords.stream()
                .filter(r -> !r.getId().equals(dailyRecordId))
                .mapToInt(r -> r.getMortality() != null ? r.getMortality() : 0)
                .sum();

        int newMortality = request.getMortality() != null ? request.getMortality() : (record.getMortality() != null ? record.getMortality() : 0);
        if (newMortality < 0) {
            throw new IllegalArgumentException("Mortality cannot be negative");
        }
        int availableForThisRecord = Math.max(0, batch.getInitialBirds() - otherRecordsMortality - totalBirdsSold);
        if (newMortality > availableForThisRecord) {
            throw new InvalidMortalityException("Mortality (" + newMortality + ") exceeds available live birds (" + availableForThisRecord + ")");
        }

        record.setRecordDate(recordDate);
        record.setMorningMortality(request.getMorningMortality() != null ? request.getMorningMortality() : 0);
        record.setMortality(newMortality);
        record.setFeedType(displayFeedType);
        record.setBagCapacityKg(bagCapacityKg);
        record.setFeedBagsConsumed(feedBagsConsumed);
        record.setFeedConsumedKg(todaysFeedKg);
        record.setMinFeedIntakeG(request.getMinFeedIntakeG());
        record.setMinBodyWeightG(request.getMinBodyWeightG());
        record.setAvgWeightG(request.getAvgWeightG());
        record.setStandardFcr(request.getStandardFcr());
        record.setFeedBagsTotal(request.getFeedBagsTotal());
        record.setFeedBagsClosingStock(request.getFeedBagsClosingStock());
        record.setSignature(request.getSignature());
        record.setNotes(request.getNotes());

        dailyRecordRepository.save(record);

        // Recalculate cumulative metrics across all records
        List<DailyRecord> records = dailyRecordRepository.findByBatchIdOrderByRecordDateAsc(batchId);

        int cumulativeMortality = 0;
        BigDecimal cumulativeFeed = BigDecimal.ZERO;
        for (DailyRecord item : records) {
            cumulativeMortality += (item.getMortality() != null ? item.getMortality() : 0);
            item.setCumulativeMortality(cumulativeMortality);
            item.setRemainingBirds(Math.max(0, batch.getInitialBirds() - cumulativeMortality - totalBirdsSold));
            if (batch.getInitialBirds() > 0) {
                item.setCumulativeMortalityPct(BigDecimal.valueOf(cumulativeMortality)
                        .multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(batch.getInitialBirds()), 2, RoundingMode.HALF_UP));
            }
            cumulativeFeed = cumulativeFeed.add(item.getFeedConsumedKg() != null ? item.getFeedConsumedKg() : BigDecimal.ZERO);
            item.setCumulativeFeedActualKg(cumulativeFeed);
            item.setFcr(calculateFcr(cumulativeFeed, item.getAvgWeightG(), item.getRemainingBirds(), batch.getInitialBirds()));
            dailyRecordRepository.save(item);
        }

        feedLoadService.syncFeedStock(batchId);

        return toResponse(record);
    }

    public void validateFeedCapacityStock(
            Long batchId,
            Long recordIdToExclude,
            String normalizedFeedType,
            String displayFeedType,
            BigDecimal bagCapacityKg,
            BigDecimal requestedBags
    ) {
        BigDecimal loadedBagsForCapacity = feedLoadRepository.findByBatchIdOrderByLoadDateAsc(batchId).stream()
                .filter(l -> normalizedFeedType.equals(FeedLoadService.normalizeFeedType(l.getFeedType())))
                .filter(l -> {
                    BigDecimal cap = l.getWeightPerBagKg() != null ? l.getWeightPerBagKg() : DEFAULT_BAG_WEIGHT_KG;
                    return cap.compareTo(bagCapacityKg) == 0;
                })
                .map(l -> l.getBags() != null ? l.getBags() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal previouslyConsumedBagsForCapacity = dailyRecordRepository.findByBatchIdOrderByRecordDateAsc(batchId).stream()
                .filter(r -> recordIdToExclude == null || !r.getId().equals(recordIdToExclude))
                .filter(r -> normalizedFeedType.equals(FeedLoadService.normalizeFeedType(r.getFeedType())))
                .filter(r -> {
                    BigDecimal cap = r.getBagCapacityKg() != null ? r.getBagCapacityKg() : DEFAULT_BAG_WEIGHT_KG;
                    return cap.compareTo(bagCapacityKg) == 0;
                })
                .map(r -> {
                    if (r.getFeedBagsConsumed() != null && r.getFeedBagsConsumed().compareTo(BigDecimal.ZERO) > 0) {
                        return r.getFeedBagsConsumed();
                    }
                    if (r.getFeedConsumedKg() != null && r.getFeedConsumedKg().compareTo(BigDecimal.ZERO) > 0) {
                        BigDecimal cap = r.getBagCapacityKg() != null ? r.getBagCapacityKg() : DEFAULT_BAG_WEIGHT_KG;
                        return r.getFeedConsumedKg().divide(cap, 2, RoundingMode.HALF_UP);
                    }
                    return BigDecimal.ZERO;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal availableBags = loadedBagsForCapacity.subtract(previouslyConsumedBagsForCapacity);
        if (availableBags.compareTo(BigDecimal.ZERO) < 0) {
            availableBags = BigDecimal.ZERO;
        }

        if (requestedBags.compareTo(availableBags) > 0) {
            String capStr = bagCapacityKg.stripTrailingZeros().toPlainString();
            String availStr = availableBags.stripTrailingZeros().toPlainString();
            throw new InsufficientFeedStockException(
                    String.format("Insufficient %s %s kg feed bags. Available: %s bags.", displayFeedType, capStr, availStr)
            );
        }
    }

    @Transactional
    public void deleteDailyRecord(Long batchId, Long dailyRecordId, Long loggedInUserId) {
        Batch batch = getOwnedBatchOrThrow(batchId, loggedInUserId);
        DailyRecord record = dailyRecordRepository.findById(dailyRecordId)
                .orElseThrow(() -> new EntityNotFoundException("Daily record not found: " + dailyRecordId));

        if (!record.getBatch().getId().equals(batchId)) {
            throw new IllegalArgumentException("This daily record does not belong to the selected batch");
        }
        if (batch.getStatus() == BatchStatus.COMPLETED) {
            throw new com.poultry.poultrymanagement.exception.BatchCompletedException("Cannot delete daily records. This batch is already completed.");
        }
        if (batch.getStatus() != BatchStatus.ACTIVE) {
            throw new IllegalStateException("Daily records can only be deleted from an ACTIVE batch");
        }

        dailyRecordRepository.delete(record);

        int totalBirdsSold = saleRepository.findByBatchIdOrderBySaleDateAsc(batchId).stream()
                .mapToInt(s -> s.getBirdsSold() != null ? s.getBirdsSold() : 0)
                .sum();

        List<DailyRecord> records = dailyRecordRepository.findByBatchIdOrderByRecordDateAsc(batchId);

        int cumulativeMortality = 0;
        BigDecimal cumulativeFeed = BigDecimal.ZERO;
        for (DailyRecord item : records) {
            cumulativeMortality += (item.getMortality() != null ? item.getMortality() : 0);
            item.setCumulativeMortality(cumulativeMortality);
            item.setRemainingBirds(Math.max(0, batch.getInitialBirds() - cumulativeMortality - totalBirdsSold));
            if (batch.getInitialBirds() > 0) {
                item.setCumulativeMortalityPct(BigDecimal.valueOf(cumulativeMortality)
                        .multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(batch.getInitialBirds()), 2, RoundingMode.HALF_UP));
            }
            cumulativeFeed = cumulativeFeed.add(item.getFeedConsumedKg() != null ? item.getFeedConsumedKg() : BigDecimal.ZERO);
            item.setCumulativeFeedActualKg(cumulativeFeed);
            item.setFcr(calculateFcr(cumulativeFeed, item.getAvgWeightG(), item.getRemainingBirds(), batch.getInitialBirds()));
            dailyRecordRepository.save(item);
        }

        feedLoadService.syncFeedStock(batchId);
    }

    private BigDecimal calculateFcr(BigDecimal cumulativeFeedKg, BigDecimal avgWeightG, int remainingBirds, int initialBirds) {
        if (avgWeightG == null || remainingBirds <= 0 || cumulativeFeedKg == null || cumulativeFeedKg.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }

        BigDecimal currentTotalWeightKg = avgWeightG
                .divide(BigDecimal.valueOf(1000), 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(remainingBirds));

        BigDecimal startingTotalWeightKg = CHICK_WEIGHT_G
                .divide(BigDecimal.valueOf(1000), 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(initialBirds));

        BigDecimal totalWeightGainKg = currentTotalWeightKg.subtract(startingTotalWeightKg);

        if (totalWeightGainKg.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }

        return cumulativeFeedKg.divide(totalWeightGainKg, 3, RoundingMode.HALF_UP);
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

    private DailyRecordResponse toResponse(DailyRecord record) {
        int ageDays = 0;
        if (record.getBatch() != null && record.getBatch().getStartDate() != null && record.getRecordDate() != null) {
            ageDays = (int) ChronoUnit.DAYS.between(record.getBatch().getStartDate(), record.getRecordDate()) + 1;
            if (ageDays < 1) ageDays = 1;
        }

        return DailyRecordResponse.builder()
                .id(record.getId())
                .batchId(record.getBatch().getId())
                .recordDate(record.getRecordDate())
                .ageDays(ageDays)
                .morningMortality(record.getMorningMortality())
                .mortality(record.getMortality())
                .cumulativeMortality(record.getCumulativeMortality())
                .cumulativeMortalityPct(record.getCumulativeMortalityPct())
                .remainingBirds(record.getRemainingBirds())
                .feedType(record.getFeedType())
                .bagCapacityKg(record.getBagCapacityKg())
                .minFeedIntakeG(record.getMinFeedIntakeG())
                .cumulativeFeedMinKg(record.getCumulativeFeedMinKg())
                .cumulativeFeedActualKg(record.getCumulativeFeedActualKg())
                .feedBagsConsumed(record.getFeedBagsConsumed())
                .feedConsumedKg(record.getFeedConsumedKg())
                .minBodyWeightG(record.getMinBodyWeightG())
                .avgWeightG(record.getAvgWeightG())
                .standardFcr(record.getStandardFcr())
                .fcr(record.getFcr())
                .feedBagsTotal(record.getFeedBagsTotal())
                .feedBagsClosingStock(record.getFeedBagsClosingStock())
                .signature(record.getSignature())
                .notes(record.getNotes())
                .createdAt(record.getCreatedAt())
                .build();
    }
}
