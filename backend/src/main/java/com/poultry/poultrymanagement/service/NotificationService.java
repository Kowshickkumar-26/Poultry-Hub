package com.poultry.poultrymanagement.service;

import com.poultry.poultrymanagement.dto.NotificationDto;
import com.poultry.poultrymanagement.entity.Batch;
import com.poultry.poultrymanagement.entity.BatchStatus;
import com.poultry.poultrymanagement.entity.DailyRecord;
import com.poultry.poultrymanagement.entity.Farmer;
import com.poultry.poultrymanagement.entity.FeedLoad;
import com.poultry.poultrymanagement.entity.Role;
import com.poultry.poultrymanagement.repository.BatchRepository;
import com.poultry.poultrymanagement.repository.DailyRecordRepository;
import com.poultry.poultrymanagement.repository.FarmerRepository;
import com.poultry.poultrymanagement.repository.FeedLoadRepository;
import com.poultry.poultrymanagement.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final BatchRepository batchRepository;
    private final FarmerRepository farmerRepository;
    private final DailyRecordRepository dailyRecordRepository;
    private final FeedLoadRepository feedLoadRepository;
    private final SaleRepository saleRepository;

    private static final BigDecimal DEFAULT_BAG_WEIGHT_KG = BigDecimal.valueOf(50);

    // In-memory read tracking per user
    private final Map<Long, Set<String>> userReadMap = new ConcurrentHashMap<>();

    @Transactional(readOnly = true)
    public List<NotificationDto> getNotifications(Long loggedInUserId, Role role) {
        List<NotificationDto> result = new ArrayList<>();

        if (role == Role.FARMER) {
            Farmer farmer = farmerRepository.findByUserId(loggedInUserId).orElse(null);
            if (farmer != null) {
                // Active Batch notifications
                List<Batch> activeBatches = batchRepository.findByFarmerIdAndStatus(farmer.getId(), BatchStatus.ACTIVE);
                if (!activeBatches.isEmpty()) {
                    Batch batch = activeBatches.get(0);
                    Long batchId = batch.getId();
                    String batchCode = batch.getBatchCode();

                    // 1. Missing Daily Record for Today
                    if (batch.getStartDate() != null && !batch.getStartDate().isAfter(LocalDate.now())) {
                        if (dailyRecordRepository.findByBatchIdAndRecordDate(batchId, LocalDate.now()).isEmpty()) {
                            result.add(NotificationDto.builder()
                                    .id("daily-missing-" + batchId + "-" + LocalDate.now())
                                    .type("DAILY_RECORD_MISSING")
                                    .title("Daily Record Pending")
                                    .message("No daily record recorded today (" + LocalDate.now() + ") for batch " + batchCode + ".")
                                    .category("DAILY_RECORD")
                                    .severity("WARNING")
                                    .link("/farmer/daily-records")
                                    .batchId(batchId)
                                    .batchCode(batchCode)
                                    .createdAt(LocalDate.now().atTime(9, 0))
                                    .build());
                        }
                    }

                    // 2. Batch Remaining Birds / Ready to End
                    int initialBirds = batch.getInitialBirds() != null ? batch.getInitialBirds() : 0;
                    int totalMortality = dailyRecordRepository.findByBatchIdOrderByRecordDateAsc(batchId).stream()
                            .mapToInt(r -> r.getMortality() != null ? r.getMortality() : 0)
                            .sum();
                    int totalBirdsSold = saleRepository.findByBatchIdOrderBySaleDateAsc(batchId).stream()
                            .mapToInt(s -> s.getBirdsSold() != null ? s.getBirdsSold() : 0)
                            .sum();
                    int remainingBirds = Math.max(0, initialBirds - totalMortality - totalBirdsSold);

                    if (remainingBirds == 0) {
                        result.add(NotificationDto.builder()
                                .id("batch-ready-" + batchId)
                                .type("BATCH_READY_TO_END")
                                .title("Batch Ready to End")
                                .message("All " + initialBirds + " birds accounted for (0 remaining). You can now end batch " + batchCode + " and download the closing report.")
                                .category("BATCH")
                                .severity("SUCCESS")
                                .link("/farmer/end-batch")
                                .batchId(batchId)
                                .batchCode(batchCode)
                                .createdAt(LocalDateTime.now())
                                .build());
                    } else if (totalBirdsSold > 0 || (batch.getStartDate() != null && ChronoUnit.DAYS.between(batch.getStartDate(), LocalDate.now()) >= 30)) {
                        result.add(NotificationDto.builder()
                                .id("batch-remaining-" + batchId + "-" + remainingBirds)
                                .type("BATCH_REMAINING_BIRDS")
                                .title("Active Birds Remaining")
                                .message("Batch " + batchCode + " has " + remainingBirds + " birds remaining. Account for all birds before closing.")
                                .category("BATCH")
                                .severity("INFO")
                                .link("/farmer/end-batch")
                                .batchId(batchId)
                                .batchCode(batchCode)
                                .createdAt(LocalDateTime.now())
                                .build());
                    }

                    // 3. Feed Stock Alerts (by type & capacity)
                    List<FeedLoad> feedLoads = feedLoadRepository.findByBatchIdOrderByLoadDateAsc(batchId);
                    List<DailyRecord> records = dailyRecordRepository.findByBatchIdOrderByRecordDateAsc(batchId);

                    Set<String> processedKeys = new HashSet<>();
                    for (FeedLoad load : feedLoads) {
                        String normFeed = FeedLoadService.normalizeFeedType(load.getFeedType());
                        BigDecimal cap = load.getWeightPerBagKg() != null ? load.getWeightPerBagKg() : DEFAULT_BAG_WEIGHT_KG;
                        String key = normFeed + "#" + cap.stripTrailingZeros().toPlainString();

                        if (processedKeys.add(key)) {
                            BigDecimal loadedBags = feedLoads.stream()
                                    .filter(l -> normFeed.equals(FeedLoadService.normalizeFeedType(l.getFeedType())))
                                    .filter(l -> {
                                        BigDecimal c = l.getWeightPerBagKg() != null ? l.getWeightPerBagKg() : DEFAULT_BAG_WEIGHT_KG;
                                        return c.compareTo(cap) == 0;
                                    })
                                    .map(l -> l.getBags() != null ? l.getBags() : BigDecimal.ZERO)
                                    .reduce(BigDecimal.ZERO, BigDecimal::add);

                            BigDecimal consumedBags = records.stream()
                                    .filter(r -> normFeed.equals(FeedLoadService.normalizeFeedType(r.getFeedType())))
                                    .filter(r -> {
                                        BigDecimal c = r.getBagCapacityKg() != null ? r.getBagCapacityKg() : DEFAULT_BAG_WEIGHT_KG;
                                        return c.compareTo(cap) == 0;
                                    })
                                    .map(r -> {
                                        if (r.getFeedBagsConsumed() != null && r.getFeedBagsConsumed().compareTo(BigDecimal.ZERO) > 0) {
                                            return r.getFeedBagsConsumed();
                                        }
                                        if (r.getFeedConsumedKg() != null && r.getFeedConsumedKg().compareTo(BigDecimal.ZERO) > 0) {
                                            BigDecimal c = r.getBagCapacityKg() != null ? r.getBagCapacityKg() : DEFAULT_BAG_WEIGHT_KG;
                                            return r.getFeedConsumedKg().divide(c, 2, RoundingMode.HALF_UP);
                                        }
                                        return BigDecimal.ZERO;
                                    })
                                    .reduce(BigDecimal.ZERO, BigDecimal::add);

                            BigDecimal availableBags = loadedBags.subtract(consumedBags);
                            String displayType = FeedLoadService.formatFeedTypeDisplay(normFeed);
                            String capStr = cap.stripTrailingZeros().toPlainString();

                            if (availableBags.compareTo(BigDecimal.ZERO) <= 0) {
                                result.add(NotificationDto.builder()
                                        .id("feed-empty-" + batchId + "-" + normFeed + "-" + capStr)
                                        .type("FEED_OUT_OF_STOCK")
                                        .title("Feed Out of Stock")
                                        .message(displayType + " (" + capStr + " kg) feed is exhausted (0 bags left). Please load feed.")
                                        .category("FEED")
                                        .severity("CRITICAL")
                                        .link("/farmer/feed")
                                        .batchId(batchId)
                                        .batchCode(batchCode)
                                        .createdAt(LocalDateTime.now())
                                        .build());
                            } else if (availableBags.compareTo(BigDecimal.valueOf(5)) <= 0) {
                                result.add(NotificationDto.builder()
                                        .id("feed-low-" + batchId + "-" + normFeed + "-" + capStr)
                                        .type("FEED_LOW")
                                        .title("Low Feed Stock")
                                        .message(displayType + " (" + capStr + " kg) stock is low (" + availableBags.stripTrailingZeros().toPlainString() + " bags remaining).")
                                        .category("FEED")
                                        .severity("WARNING")
                                        .link("/farmer/feed")
                                        .batchId(batchId)
                                        .batchCode(batchCode)
                                        .createdAt(LocalDateTime.now())
                                        .build());
                            }
                        }
                    }
                }

                // Check recently completed batches
                List<Batch> completed = batchRepository.findByFarmerIdAndStatus(farmer.getId(), BatchStatus.COMPLETED);
                if (!completed.isEmpty()) {
                    Batch latestCompleted = completed.stream()
                            .max((a, b) -> {
                                if (a.getEndDate() != null && b.getEndDate() != null) {
                                    return a.getEndDate().compareTo(b.getEndDate());
                                }
                                return a.getId().compareTo(b.getId());
                            })
                            .orElse(null);

                    if (latestCompleted != null) {
                        result.add(NotificationDto.builder()
                                .id("batch-completed-" + latestCompleted.getId())
                                .type("BATCH_COMPLETED")
                                .title("Batch Closing Report Available")
                                .message("Batch " + latestCompleted.getBatchCode() + " completed. Download your Batch Closing Report PDF.")
                                .category("BATCH")
                                .severity("INFO")
                                .link("/farmer/reports")
                                .batchId(latestCompleted.getId())
                                .batchCode(latestCompleted.getBatchCode())
                                .createdAt(latestCompleted.getEndDate() != null ? latestCompleted.getEndDate().atTime(18, 0) : LocalDateTime.now())
                                .build());
                    }
                }
            }
        } else {
            // CEO / ADMIN role
            List<Batch> activeBatches = batchRepository.findByStatus(BatchStatus.ACTIVE);
            for (Batch batch : activeBatches) {
                int initialBirds = batch.getInitialBirds() != null ? batch.getInitialBirds() : 0;
                int totalMortality = dailyRecordRepository.findByBatchIdOrderByRecordDateAsc(batch.getId()).stream()
                        .mapToInt(r -> r.getMortality() != null ? r.getMortality() : 0)
                        .sum();

                if (initialBirds > 0 && (totalMortality * 100 / initialBirds) >= 5) {
                    String farmName = batch.getFarm() != null ? batch.getFarm().getName() : "Farm";
                    result.add(NotificationDto.builder()
                            .id("ceo-high-mortality-" + batch.getId())
                            .type("HIGH_MORTALITY")
                            .title("High Mortality Alert")
                            .message("Batch " + batch.getBatchCode() + " at " + farmName + " has mortality of " + totalMortality + " birds (" + (totalMortality * 100 / initialBirds) + "%).")
                            .category("BATCH")
                            .severity("CRITICAL")
                            .link("/ceo/farms")
                            .batchId(batch.getId())
                            .batchCode(batch.getBatchCode())
                            .createdAt(LocalDateTime.now())
                            .build());
                }
            }
        }

        // Apply read status
        Set<String> readSet = userReadMap.getOrDefault(loggedInUserId, Collections.emptySet());
        for (NotificationDto dto : result) {
            dto.setRead(readSet.contains(dto.getId()));
        }

        return result;
    }

    public void markAsRead(Long loggedInUserId, String notificationId) {
        userReadMap.computeIfAbsent(loggedInUserId, k -> ConcurrentHashMap.newKeySet()).add(notificationId);
    }

    public void markAllAsRead(Long loggedInUserId, Role role) {
        List<NotificationDto> list = getNotifications(loggedInUserId, role);
        Set<String> readSet = userReadMap.computeIfAbsent(loggedInUserId, k -> ConcurrentHashMap.newKeySet());
        for (NotificationDto dto : list) {
            readSet.add(dto.getId());
        }
    }
}
